import React, { useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import * as topojson from "topojson-client";
import iranData from "./Shahrestan1400-3x-simple.json";

interface CountyFeature {
  type: "Feature";
  properties: {
    // Fields from iran-counties.json
    GID_2?: string;
    GID_0?: string;
    COUNTRY?: string;
    GID_1?: string;
    NAME_1?: string; // Province name in English
    NL_NAME_1?: string; // Province name in Persian
    NAME_2?: string; // County name in English
    VARNAME_2?: string;
    NL_NAME_2?: string; // County name in Persian
    TYPE_2?: string;
    ENGTYPE_2?: string;
    CC_2?: string;
    HASC_2?: string;
    // Fields from Shahrestan1400-3x-simple.json
    OBJECTID_1?: number;
    area?: number;
    perimeter?: number;
    provincName?: string; // Province name in Persian
    cityName?: string; // City/County name in Persian
    Shape_Leng?: number;
    Shape_Area?: number;
  };
  geometry: any;
}

interface ProvinceFeature {
  type: "Feature";
  properties: {
    // Fields from iran-counties.json / iran-provinces.json
    GID_0?: string;
    COUNTRY?: string;
    GID_1?: string;
    NAME_1?: string; // Province name in English
    NL_NAME_1?: string; // Province name in Persian
    TYPE_2?: string;
    // Fields from Shahrestan1400-3x-simple.json
    provincName?: string; // Province name in Persian
    // Additional fields
    countyCount?: number;
  };
  geometry: any;
}

export function Map() {
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [hoveredGeography, setHoveredGeography] = useState<string | null>(null);

  // Extract all counties from TopoJSON
  const allCounties = useMemo(() => {
    try {
      const objectKey = (iranData as any).objects["Shahrestan1400"]
        ? "Shahrestan1400"
        : "iran-counties";
      const counties = topojson.feature(
        iranData as any,
        (iranData as any).objects[objectKey]
      ) as any;
      return counties.features as CountyFeature[];
    } catch (error) {
      console.error("Error parsing TopoJSON:", error);
      return [];
    }
  }, []);

  // Create province geometries by merging counties using topojson.merge
  const provinceGeometries = useMemo(() => {
    if (allCounties.length === 0) return [];

    const objectKey = (iranData as any).objects["Shahrestan1400"]
      ? "Shahrestan1400"
      : "iran-counties";
    const provinceGroups: Record<string, CountyFeature[]> = {};

    // Group counties by province
    allCounties.forEach((county) => {
      // Support both field names: provincName (Shahrestan1400) and NAME_1 (iran-counties)
      const provinceName =
        county.properties.provincName || county.properties.NAME_1 || "";
      if (!provinceGroups[provinceName]) {
        provinceGroups[provinceName] = [];
      }
      provinceGroups[provinceName].push(county);
    });

    // Create province features by merging county geometries
    const provinces: ProvinceFeature[] = Object.entries(provinceGroups)
      .map(([provinceName, counties]) => {
        if (counties.length === 0) return null;

        const firstCounty = counties[0];

        // Get the TopoJSON geometries for this province's counties
        const provinceCountyGeometries = (iranData as any).objects[
          objectKey
        ].geometries.filter((geom: any) => {
          const geomProvinceName =
            geom.properties.provincName || geom.properties.NAME_1;
          return geomProvinceName === provinceName;
        });

        // Merge all county geometries into a single province geometry
        const mergedGeometry = topojson.merge(
          iranData as any,
          provinceCountyGeometries
        );

        return {
          type: "Feature",
          properties: {
            NAME_1: firstCounty?.properties.NAME_1,
            NL_NAME_1: firstCounty?.properties.NL_NAME_1,
            provincName: firstCounty?.properties.provincName,
            countyCount: counties.length,
          },
          geometry: mergedGeometry,
        } as ProvinceFeature;
      })
      .filter(Boolean) as ProvinceFeature[];

    return provinces;
  }, [allCounties]);

  // Current view data
  const currentGeographies = useMemo(() => {
    if (selectedProvince) {
      // Show counties for selected province
      return allCounties.filter((county) => {
        const countyProvinceName =
          county.properties.provincName || county.properties.NAME_1;
        return countyProvinceName === selectedProvince;
      });
    } else {
      // Show provinces
      return provinceGeometries;
    }
  }, [selectedProvince, allCounties, provinceGeometries]);

  // Handle geography click
  const handleClick = (geo: any) => {
    if (selectedProvince) {
      // If viewing counties, do nothing (could show county details)
      const countyName = geo.properties.cityName || geo.properties.NAME_2;
      console.log("County clicked:", countyName);
    } else {
      // If viewing provinces, drill down to counties
      const provinceName = geo.properties.provincName || geo.properties.NAME_1;
      setSelectedProvince(provinceName);
      console.log("Province selected:", provinceName);
    }
  };

  // Handle back button
  const handleBack = () => {
    setSelectedProvince(null);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Back button */}
      {selectedProvince && (
        <button
          onClick={handleBack}
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 1000,
            padding: "8px 16px",
            backgroundColor: "#333",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          ← Back to Provinces
        </button>
      )}

      {/* Info panel */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1000,
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          padding: "10px",
          borderRadius: "4px",
          fontSize: "12px",
          maxWidth: "200px",
          color: "black",
        }}
      >
        <div>
          <strong>View:</strong>{" "}
          {selectedProvince ? `${selectedProvince} Counties` : "Iran Provinces"}
        </div>
        <div>
          <strong>Count:</strong> {currentGeographies.length}
        </div>
        {hoveredGeography && (
          <div>
            <strong>Hovered:</strong> {hoveredGeography}
          </div>
        )}
      </div>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          center: [53.5, 32.5],
          scale: selectedProvince ? 1200 : 700, // Zoom in when viewing counties
        }}
        width={800}
        height={600}
        style={{
          width: "100%",
          height: "100%",
          border: "1px solid #ccc",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <Geographies
          geography={{
            type: "FeatureCollection",
            features: currentGeographies,
          }}
        >
          {({ geographies }) =>
            geographies.map((geo) => {
              const isProvince = !selectedProvince;
              const name = isProvince
                ? geo.properties.provincName || geo.properties.NAME_1 // Province name
                : geo.properties.cityName || geo.properties.NAME_2; // County name

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={() => setHoveredGeography(name)}
                  onMouseLeave={() => setHoveredGeography(null)}
                  onClick={() => handleClick(geo)}
                  style={{
                    default: {
                      fill: isProvince ? "#E2E8F0" : "#CBD5E1",
                      stroke: "#FFF",
                      strokeWidth: isProvince ? 1 : 0.5,
                      outline: "none",
                    },
                    hover: {
                      fill: isProvince ? "#3B82F6" : "#10B981",
                      stroke: "#FFF",
                      strokeWidth: isProvince ? 1 : 0.5,
                      cursor: "pointer",
                      outline: "none",
                    },
                    pressed: {
                      fill: isProvince ? "#1E40AF" : "#047857",
                      stroke: "#FFF",
                      strokeWidth: isProvince ? 1 : 0.5,
                      outline: "none",
                    },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}
