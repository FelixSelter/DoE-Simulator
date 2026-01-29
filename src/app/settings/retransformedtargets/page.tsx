"use client";

import React, { useEffect, useRef } from "react";
import styles from "./page.module.css";
import * as math from "mathjs";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import { GlobalState, TargetSettings } from "@/util/GlobalState";
import { Textarea } from "@heroui/input";
import { getUnknownsFromFormula } from "../../../util/Math";
import RetransformedTargetSettingsInput from "./RetransformedTargetSettingsInput";
import { ErrorMsg, ErrorMsgKeys, FailureMsg } from "@/util/UserMsgSystem";
import { useContextSelector } from "use-context-selector";

const defaultRetransformedTargetSettings: Omit<
  TargetSettings,
  "name" | "formulaSymbol"
> = {
  limits: [],
  numDecimalPlaces: 1,
};

// See use inside GlobalStateContextProvider.tsx
// We need to revalidate also if factors or targets change
export function validateRetransformFormula(
  formula: string,
  globalState: GlobalState,
) {
  try {
    const parsed = math.parse(formula);
    const [targets, retransformedTargets] = getUnknownsFromFormula(parsed);

    const intersect1 = new Set(targets).intersection(
      new Set(retransformedTargets),
    );
    ErrorMsg.setError(
      ErrorMsgKeys.RetransformedFormulaSameSymbolOnBothSides,
      `In the retransformed targets formula, the following symbols appear both on the left hand side (retransformed targets) and right hand side (targets and factors): ${Array.from(intersect1).join(", ")}. Please use different symbols for targets and retransformed targets.`,
      intersect1.size !== 0,
    );

    const intersect2 = new Set(
      globalState.factors.map((f) => f.formulaSymbol),
    ).intersection(new Set(retransformedTargets));
    ErrorMsg.setError(
      ErrorMsgKeys.RetransformedFormulaFactorOnLHS,
      `In the retransformed targets formula, the following retransformed target has been defined but is also used as a factor: ${Array.from(intersect2).join(", ")}. Please use different symbols for factors and retransformed targets.`,
      intersect2.size !== 0,
    );

    const intersect3 = new Set(
      globalState.targets.map((t) => t.formulaSymbol),
    ).intersection(new Set(retransformedTargets));
    ErrorMsg.setError(
      ErrorMsgKeys.RetransformedFormulaTargetOnLHS,
      `In the retransformed targets formula, the following retransformed target has been defined but is also used as a target: ${Array.from(intersect3).join(", ")}. Please use different symbols for targets and retransformed targets.`,
      intersect3.size !== 0,
    );

    const missingSymbols = targets.filter(
      (target) =>
        ![...globalState.targets, ...globalState.factors].some(
          (toCompare) => toCompare.formulaSymbol === target,
        ),
    );
    ErrorMsg.setError(
      ErrorMsgKeys.UnknownSymbolsInsideRetransformFormula,
      `You have unknown symbols inside your retransform formula. Make sure that all formula symbols match. ${missingSymbols.join(", ")} ${missingSymbols.length === 1 ? "is" : "are"} missing. Your targets are ${globalState.targets.map(
        (t) => t.formulaSymbol.toString(),
      )}. Your Factors are ${globalState.factors.map((t) =>
        t.formulaSymbol.toString(),
      )}`,
      missingSymbols.length !== 0,
    );

    ErrorMsg.clearError(ErrorMsgKeys.UnableToParseRetransformFormula);
  } catch (error) {
    ErrorMsg.setError(
      ErrorMsgKeys.UnableToParseRetransformFormula,
      `Could not parse the retransform formula: ${error}`,
    );
  }
}

export default function Page() {
  const { globalState, setGlobalState } = useContextSelector(
    GlobalStateContext,
    ({ globalState, setGlobalState }) => ({
      globalState: {
        retransformedTargets: globalState.retransformedTargets,
        rawRetransformInput: globalState.rawRetransformInput,
      },
      setGlobalState,
    }),
  );
  const textarea = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (textarea.current === null) return;
    const p = textarea.current.parentElement!.parentElement! as HTMLDivElement;
    p.classList.remove("!h-auto");
  }, [textarea.current]);

  /**Onchange listener for Formula Textarea.
   * Creates the factors by evaluating the expression inside the textarea
   */
  function onInputFormula(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const parsed = math.parse(e.target.value);
      const [, retransformedTargets] = getUnknownsFromFormula(parsed);
      const compiled = parsed.compile();

      setGlobalState((oldState) => ({
        ...oldState,
        retransformedTargets: retransformedTargets.map((formulaSymbol) => ({
          ...(oldState.retransformedTargets.find(
            (t) => t.formulaSymbol === formulaSymbol,
          ) || defaultRetransformedTargetSettings),
          formulaSymbol,
          name: formulaSymbol,
        })),
        retransformEquation: compiled,
        rawRetransformInput: e.target.value,
        measurements: [],
      }));

      ErrorMsg.clearError(ErrorMsgKeys.UnableToParseRetransformFormula);
    } catch (error) {
      ErrorMsg.setError(
        ErrorMsgKeys.UnableToParseRetransformFormula,
        `Could not parse the retransform formula: ${error}`,
      );
      setGlobalState((oldState) => ({
        ...oldState,
        rawRetransformInput: e.target.value,
        measurements: [],
      }));
    }

    new FailureMsg(
      "Measurements have been reset due to retransform formula change.",
    );
  }

  return (
    <div className={styles.retransformedTargets}>
      <div className={styles.settings}>
        {/* Pseudo element for flex space between to work like space around but avoiding overflow to the left if the space gets to narrow */}
        <div />
        {globalState.retransformedTargets.map((retransformedTarget) => (
          <RetransformedTargetSettingsInput
            key={retransformedTarget.formulaSymbol}
            target={retransformedTarget}
          />
        ))}
        <div />
      </div>
      <div className={styles.formula}>
        <Textarea
          onChange={onInputFormula}
          placeholder="Paste your retransform function here. Retransformed targets will be generated automatically"
          value={globalState.rawRetransformInput}
          fullWidth
          disableAutosize
          style={{ height: "100%" }}
          ref={textarea}
        />
      </div>
    </div>
  );
}
