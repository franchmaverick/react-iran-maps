"use client";

import styles from "./page.module.css";
import { Map } from "react-iran-maps";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Map />
      </main>
    </div>
  );
}
