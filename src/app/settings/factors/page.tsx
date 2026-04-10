"use client";

import React, { useEffect, useRef } from "react";
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
import { Input, Textarea } from "@heroui/input";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { getUnknownsFromFormula } from "@/util/Math";
import { ErrorMsg, ErrorMsgKeys, FailureMsg } from "@/util/UserMsgSystem";
import { useContextSelector } from "use-context-selector";

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
  const { globalState, setGlobalState } = useContextSelector(
    GlobalStateContext,
    ({ globalState, setGlobalState }) => ({
      globalState: {
        factors: globalState.factors,
        rawFactorInput: globalState.rawFactorInput,
        trialCounter: globalState.trialCounter,
        showFactorNoiseInChart: globalState.showFactorNoiseInMeasurements,
        costPerRun: globalState.costPerRun,
        maxBudget: globalState.maxBudget,
        livePreview: globalState.livePreview,
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
      const [factors, targets] = getUnknownsFromFormula(parsed);
      const compiled = parsed.compile();

      const intersect = new Set(factors).intersection(new Set(targets));
      ErrorMsg.setError(
        ErrorMsgKeys.TargetsFormulaSameSymbolOnBothSides,
        `In the factors formula, the following symbols appear both on the left hand side (targets) and right hand side (factors) of an equation: ${Array.from(intersect).join(", ")}. Please use different symbols for factors and targets.`,
        intersect.size !== 0,
      );

      setGlobalState((oldState) => ({
        ...oldState,
        targets: targets.map((formulaSymbol) => ({
          ...(oldState.targets.find((t) => t.formulaSymbol === formulaSymbol) ||
            defaultTargetSettings),
          formulaSymbol,
          name: formulaSymbol,
        })),
        transformEquation: compiled,
        factors: factors.map((formulaSymbol) => ({
          ...(oldState.factors.find((f) => f.formulaSymbol === formulaSymbol) ||
            defaultFactorSettings),
          formulaSymbol,
          name: formulaSymbol,
        })),
        rawFactorInput: e.target.value,
        measurements: [],
      }));
      ErrorMsg.clearError(ErrorMsgKeys.TransformFormulaInvalid);
    } catch (error) {
      ErrorMsg.setError(
        ErrorMsgKeys.TransformFormulaInvalid,
        `Could not parse the transform formula: ${error}`,
      );
      setGlobalState((oldState) => ({
        ...oldState,
        rawFactorInput: e.target.value,
        measurements: [],
      }));
    }

    ErrorMsg.clearError(ErrorMsgKeys.NoTransformFormula);

    new FailureMsg(
      "Measurements have been reset due to factor formula change.",
    );
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
          ref={textarea}
          style={{ height: "100%" }}
        />
      </div>
      <div className={styles.cost}>
        <div
          className="grid"
          style={{ gridTemplateColumns: "150px 1fr", gap: "10px" }}
        >
          <Input
            lang="en"
            type="text"
            label="Simulated Trials"
            placeholder="0"
            readOnly
            value={globalState.trialCounter.toString()}
          />
          <div className="flex flex-col gap-2">
            <Checkbox
              size="sm"
              onValueChange={(v) =>
                setGlobalState((oldState) => ({
                  ...oldState,
                  showFactorNoiseInMeasurements: v,
                }))
              }
              isSelected={globalState.showFactorNoiseInChart}
            >
              Show Monte Carlo noise of the setting parameters
            </Checkbox>
            <Checkbox
              size="sm"
              onValueChange={(v) =>
                setGlobalState((oldState) => ({
                  ...oldState,
                  livePreview: v,
                }))
              }
              isSelected={globalState.livePreview}
            >
              Live preview without Monte Carlo simulation
            </Checkbox>
          </div>
        </div>

        <Input
          lang="en"
          type="text"
          label="Cost per run"
          value={globalState.costPerRun.toString()}
          step={0.01}
          min={0}
          startContent={
            <div className="pointer-events-none flex items-center">
              <span className="text-default-400 text-small">€</span>
            </div>
          }
          onValueChange={(v) => {
            const value = Number(v);
            if (isNaN(value)) {
              ErrorMsg.setError(
                ErrorMsgKeys.CostPerRunInvalid,
                "Invalid cost per run value inside factors menu.",
              );
              return;
            } else if (value < 0) {
              ErrorMsg.setError(
                ErrorMsgKeys.CostPerRunInvalid,
                "Cost per run cannot be negative.",
              );
              return;
            }
            ErrorMsg.clearError(ErrorMsgKeys.CostPerRunInvalid);
            setGlobalState((oldState) => ({
              ...oldState,
              costPerRun: value,
            }));
          }}
        />
        <Input
          lang="en"
          type="number"
          label="Maximum Budget"
          value={globalState.maxBudget.toString()}
          step={0.01}
          min={0}
          startContent={
            <div className="pointer-events-none flex items-center">
              <span className="text-default-400 text-small">€</span>
            </div>
          }
          onValueChange={(v) => {
            const value = Number(v);
            if (isNaN(value)) {
              ErrorMsg.setError(
                ErrorMsgKeys.MaxBudgetInvalid,
                "Invalid maximum budget value inside factors menu.",
              );
              return;
            } else if (value < 0) {
              ErrorMsg.setError(
                ErrorMsgKeys.MaxBudgetInvalid,
                "Maximum budget cannot be negative.",
              );
              return;
            }
            ErrorMsg.clearError(ErrorMsgKeys.MaxBudgetInvalid);
            setGlobalState((oldState) => ({
              ...oldState,
              maxBudget: Number(v),
            }));
          }}
        />

        <Button
          color="primary"
          onPress={() =>
            setGlobalState((oldState) => ({
              ...oldState,
              spendMoney: 0,
              trialCounter: 0,
              measurements: [],
            }))
          }
        >
          Reset counter and measurements
        </Button>
      </div>
    </div>
  );
}
