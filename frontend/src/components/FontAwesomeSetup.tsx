"use client";

import { useEffect } from "react";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";

export default function FontAwesomeSetup() {
  useEffect(() => {
    config.autoAddCss = false;
  }, []);
  return null;
}


