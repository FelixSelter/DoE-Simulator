"use client";

import React, { useContext } from "react";
import styles from "./page.module.css";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import TargetSettingsInput from "./TargetSettingsInput";

export default function Page() {
  const { globalState } = useContext(GlobalStateContext);

  return (
    <div className={styles.settings}>
      <div />
      {globalState.targets.map((target) => {
        return (
          <TargetSettingsInput key={target.formulaSymbol} target={target} />
        );
      })}
      <div />
    </div>
  );
}
