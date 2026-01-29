"use client";

import styles from "./page.module.css";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import TargetSettingsInput from "./TargetSettingsInput";
import { useContextSelector } from "use-context-selector";

export default function Page() {
  const { globalState } = useContextSelector(
    GlobalStateContext,
    ({ globalState }) => ({ globalState: { targets: globalState.targets } }),
  );

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
