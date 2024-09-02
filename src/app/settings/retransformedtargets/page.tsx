"use client";

import React, { useContext } from "react";
import styles from "./page.module.css";
import * as math from "mathjs";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import { TargetSettings } from "@/util/GlobalState";
import { Textarea } from "@nextui-org/input";
import { getUnknownsFromFormula } from "../../../util/Math";
import RetransformedTargetSettingsInput from "./RetransformedTargetSettingsInput";
import { ErrorMsg, ErrorMsgKeys } from "@/util/UserMsgSystem";

const defaultRetransformedTargetSettings: Omit<
  TargetSettings,
  "name" | "formulaSymbol"
> = {
  limits: [],
  numDecimalPlaces: 1,
};

export default function Page() {
  const { globalState, setGlobalState } = useContext(GlobalStateContext);

  /**Onchange listener for Formula Textarea.
   * Creates the factors by evaluating the expression inside the textarea
   */
  function onInputFormula(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const parsed = math.parse(e.target.value);
      const [targets, retransformedTargets] = getUnknownsFromFormula(parsed);
      const compiled = parsed.compile();

      const missingSymbols = targets.filter(
        (target) =>
          ![...globalState.targets, ...globalState.factors].some(
            (toCompare) => toCompare.formulaSymbol === target
          )
      );
      ErrorMsg.setError(
        ErrorMsgKeys.UnknownSymbolsInsideRetransformFormula,
        `You have unknown symbols inside your retransform formula. Make sure that all formula symbols match. ${missingSymbols.toString()} Are missing. Your targets are ${globalState.targets.map(
          (t) => t.formulaSymbol.toString()
        )}. Your Factors are ${globalState.factors.map((t) =>
          t.formulaSymbol.toString()
        )}`,
        missingSymbols.length !== 0
      );

      setGlobalState((oldState) => ({
        ...oldState,
        retransformedTargets: retransformedTargets.map((formulaSymbol) => ({
          ...defaultRetransformedTargetSettings,
          formulaSymbol,
          name: formulaSymbol,
        })),
        retransformEquation: compiled,
        rawRetransfromInput: e.target.value,
      }));

      ErrorMsg.clearError(ErrorMsgKeys.RetransformFormulaInvalid);
    } catch (error) {
      ErrorMsg.setError(
        ErrorMsgKeys.TransformFormulaInvalid,
        `Could not parse the retransform formula: ${error}`
      );
      setGlobalState((oldState) => ({
        ...oldState,
        rawRetransfromInput: e.target.value,
      }));
    }
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
          value={globalState.rawRetransfromInput}
          fullWidth
          disableAutosize
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
