"use client";

import React, { useContext } from "react";
import styles from "./page.module.css";
import * as math from "mathjs";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import {
  DeviationType,
  FactorSettings,
  NoiseType,
  TargetSettings,
} from "@/util/GlobalState";
import FactorSettingsInput from "./FactorSettingsInput";
import { Input, Textarea } from "@nextui-org/input";
import { Button, Checkbox } from "@nextui-org/react";
import { getUnknownsFromFormula } from "@/util/Math";
import { ErrorMsg, ErrorMsgKeys } from "@/util/UserMsgSystem";

const defaultFactorSettings: Omit<FactorSettings, "name" | "formulaSymbol"> = {
  isInteger: false,
  minValue: 0,
  maxValue: 1,
  defaultValue: 0.5,
  numDecimalPlaces: 1,
  noiseType: NoiseType.GaussianWhiteNoise,
  deviation: 0,
  deviationType: DeviationType.Absolute,
};

const defaultTargetSettings: Omit<TargetSettings, "name" | "formulaSymbol"> = {
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
      const [factors, targets] = getUnknownsFromFormula(parsed);
      const compiled = parsed.compile();

      setGlobalState((oldState) => ({
        ...oldState,
        targets: targets.map((formulaSymbol) => ({
          ...defaultTargetSettings,
          formulaSymbol,
          name: formulaSymbol,
        })),
        transformEquation: compiled,
        factors: factors.map((formulaSymbol) => ({
          ...defaultFactorSettings,
          formulaSymbol,
          name: formulaSymbol,
        })),
        rawFactorInput: e.target.value,
      }));
      ErrorMsg.clearError(ErrorMsgKeys.TransformFormulaInvalid);
    } catch (error) {
      ErrorMsg.setError(
        ErrorMsgKeys.TransformFormulaInvalid,
        `Could not parse the transform formula: ${error}`
      );
      setGlobalState((oldState) => ({
        ...oldState,
        rawRetransfromInput: e.target.value,
      }));
    }
  }
  return (
    <div className={styles.factors}>
      <div className={styles.settings}>
        {/* Pseudo element for flex space between to work like space around but avoiding overflow to the left if the space gets to narrow */}
        <div />
        {globalState.factors.map((factor) => (
          <FactorSettingsInput key={factor.formulaSymbol} factor={factor} />
        ))}
        <div />
      </div>
      <div className={styles.formula}>
        <Textarea
          onChange={onInputFormula}
          placeholder="Paste your transfer function here. Factors will be generated automatically"
          value={globalState.rawFactorInput}
          fullWidth
          disableAutosize
          style={{ height: "100%" }}
        />
      </div>
      <div className={styles.cost}>
        <div
          className="grid"
          style={{ gridTemplateColumns: "150px 1fr", gap: "10px" }}
        >
          <Input
            type="text"
            label="Number of trials"
            placeholder="0"
            labelPlacement="outside"
            readOnly
            value={globalState.trialCounter.toString()}
          />
          <Checkbox
            size="sm"
            onValueChange={(v) =>
              setGlobalState((oldState) => ({
                ...oldState,
                showFactorNoiseInChart: v,
              }))
            }
            isSelected={globalState.showFactorNoiseInChart}
          >
            Show factor noise in chart
          </Checkbox>
        </div>

        <Input
          type="number"
          label="Cost per replication"
          value={globalState.costPerReplication.toString()}
          labelPlacement="outside"
          step={0.01}
          min={0}
          startContent={
            <div className="pointer-events-none flex items-center">
              <span className="text-default-400 text-small">€</span>
            </div>
          }
          onValueChange={(v) =>
            setGlobalState((oldState) => ({
              ...oldState,
              costPerReplication: Number(v),
            }))
          }
        />
        <Input
          type="number"
          label="Maximum Budget"
          value={globalState.maxBudget.toString()}
          step={0.01}
          min={0}
          labelPlacement="outside"
          startContent={
            <div className="pointer-events-none flex items-center">
              <span className="text-default-400 text-small">€</span>
            </div>
          }
          onValueChange={(v) =>
            setGlobalState((oldState) => ({
              ...oldState,
              maxBudget: Number(v),
            }))
          }
        />

        <Button
          color="primary"
          onClick={() =>
            setGlobalState((oldState) => ({
              ...oldState,
              spendMoney: 0,
              trialCounter: 0,
            }))
          }
        >
          Reset counter
        </Button>
      </div>
    </div>
  );
}
