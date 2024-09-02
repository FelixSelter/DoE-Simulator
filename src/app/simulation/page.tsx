"use client";

import React, { useContext, useRef, useState } from "react";
import styles from "./page.module.css";
import ScoreMetre from "@/components/ScoreMetre";
import { Input } from "@nextui-org/input";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import InputGroup from "./InputGroup";
import { DeviationType, Measurement, NoiseType } from "@/util/GlobalState";
import { boxMueller, uniformRandom } from "@/util/Math";
import { Select, SelectItem } from "@nextui-org/react";
import {
  ErrorMsg,
  ErrorMsgKeys,
  FailureMsg,
  ProgressInfo,
} from "@/util/UserMsgSystem";

enum DisplayableValue {
  Transformed = "transformed",
  Retransformed = "retransformed",
}

export default function Page() {
  const { globalState, setGlobalState } = useContext(GlobalStateContext);
  const [repsInvalid] = useState(false);
  const values = useRef(new Map<string, number>());
  const [isRunning, setIsRunning] = useState(false);

  async function executeTrial() {
    if (isRunning) {
      new FailureMsg("Please wait for your other trials to finish");
      return;
    }

    ErrorMsg.setError(
      ErrorMsgKeys.NoTransformFormula,
      "No transform equation has been specified in settings",
      globalState.transformEquation === undefined
    );
    ErrorMsg.setError(
      ErrorMsgKeys.NoRetransformFormula,
      "No retransform equation has been specified in settings",
      globalState.retransformEquation === undefined
    );

    if (ErrorMsg.isInErrorState()) return;

    if (
      globalState.spendMoney +
        globalState.replicationsPerTrial * globalState.costPerReplication >
      globalState.maxBudget
    ) {
      new FailureMsg(
        "You cannot do more trials because you have run out of money"
      );
      return;
    }

    setIsRunning(true);
    const trial = globalState.trialCounter + 1;

    const progressInfo = new ProgressInfo(
      `Rep 0/${globalState.replicationsPerTrial} of trial ${trial}`
    );
    for (
      let replication = 1;
      replication <= globalState.replicationsPerTrial;
      replication++
    ) {
      progressInfo.setMsg(
        `Rep ${replication}/${globalState.replicationsPerTrial} of trial ${trial}`
      );
      progressInfo.setProgress(replication / globalState.replicationsPerTrial);

      const measurementData = new Map(values.current);
      for (const [key, value] of values.current.entries())
        measurementData.set(`${key}_raw`, value);

      // Monte carlo
      ErrorMsg.clearError(ErrorMsgKeys.UnknownNoiseType);
      for (const factor of globalState.factors) {
        if (factor.deviation == 0) continue;

        let randomFunction;
        switch (factor.noiseType) {
          case NoiseType.UniformWhiteNoise:
            randomFunction = uniformRandom;
            break;
          case NoiseType.GaussianWhiteNoise:
            randomFunction = boxMueller;
            break;

          default:
            ErrorMsg.setError(
              ErrorMsgKeys.UnknownNoiseType,
              `Unsupported noise function (${factor.noiseType}). Please contact a developer`
            );
            throw new NotImplementedError();
        }

        ErrorMsg.clearError(ErrorMsgKeys.UnknownDeviationType);
        let randomOffset;
        switch (factor.deviationType) {
          case DeviationType.Absolute:
            randomOffset = randomFunction(-factor.deviation, factor.deviation);
            break;

          case DeviationType.Percentage: {
            const absolute =
              (factor.deviation / 100) * (factor.maxValue - factor.minValue);
            randomOffset = randomFunction(-absolute, absolute);
            break;
          }

          default:
            ErrorMsg.setError(
              ErrorMsgKeys.UnknownDeviationType,
              `Unsupported deviation type (${factor.noiseType}). Please contact a developer`
            );
            throw new NotImplementedError();
        }

        measurementData.set(
          factor.formulaSymbol,
          measurementData.get(factor.formulaSymbol)! + randomOffset
        );
      }

      const transformResult =
        globalState.transformEquation.evaluate(measurementData);
      if (typeof transformResult === "number") {
        measurementData.set(
          globalState.targets[0].formulaSymbol,
          transformResult as number
        );
      } else {
        for (let i = 0; i < globalState.targets.length; i++)
          measurementData.set(
            globalState.targets[i].formulaSymbol,
            transformResult.entries[i]
          );
      }

      const retransformResult =
        globalState.retransformEquation.evaluate(measurementData);

      if (typeof retransformResult === "number") {
        measurementData.set(
          globalState.retransformedTargets[0].formulaSymbol,
          retransformResult as number
        );
      } else {
        for (let i = 0; i < globalState.retransformedTargets.length; i++)
          measurementData.set(
            globalState.retransformedTargets[i].formulaSymbol,
            retransformResult.entries[i]
          );
      }

      const measurement: Measurement = {
        key: `${trial}-${replication}`,
        Trial: trial,
        Rep: replication,
        ...Object.fromEntries(measurementData),
      };

      setGlobalState((oldState) => ({
        ...oldState,
        trialCounter: trial,
        spendMoney: oldState.spendMoney + oldState.costPerReplication,
        measurements: [...oldState.measurements, measurement],
      }));

      //Delay
      await new Promise((resolve) => setTimeout(resolve, delay * 1000));
    }
    setIsRunning(false);
  }

  const [displayedValue, setDisplayedValue] = useState<DisplayableValue>(
    DisplayableValue.Transformed
  );
  const [delay, setDelay] = useState(1);

  return (
    <div className={styles.simulation}>
      <div className={styles.outputContainer}>
        <div />
        {(displayedValue === DisplayableValue.Transformed
          ? globalState.targets
          : globalState.retransformedTargets
        ).map((target) => (
          <ScoreMetre key={target.formulaSymbol} target={target} />
        ))}
        <div />
      </div>

      <div className={styles.inputContainer}>
        {globalState.factors.map((factor) => (
          <div key={factor.formulaSymbol} className={styles.input}>
            <InputGroup formulaSymbol={factor.name} ref={values} />
          </div>
        ))}
      </div>
      <div className={styles.controlsContainer}>
        <Input
          type="text"
          label="Trial"
          isReadOnly
          labelPlacement="outside"
          value={globalState.trialCounter.toString()}
        />
        <Input
          type="text"
          label="Cost"
          placeholder="0000.00"
          isReadOnly
          labelPlacement="outside"
          value={globalState.spendMoney.toString()}
          startContent={
            <div className="pointer-events-none flex items-center">
              <span className="text-default-400 text-small">€</span>
            </div>
          }
        />
        <Input
          type="number"
          label="Replications per Trial"
          placeholder="1"
          labelPlacement="outside"
          isInvalid={repsInvalid}
          min={1}
          value={globalState.replicationsPerTrial.toString()}
          onValueChange={(v) => {
            if (v.includes(".")) v = v.split(".")[0];
            setGlobalState((oldState) => ({
              ...oldState,
              replicationsPerTrial: Number(v),
            }));
          }}
        />
        <div
          className="flex w-full"
          style={{ justifyContent: "space-around", alignItems: "center" }}
        >
          <button className={styles.trialButton} onClick={executeTrial}>
            Run
          </button>
          <div
            style={{
              width: "150px",
              justifyContent: "space-around",
              gap: "5px",
            }}
            className="flex flex-col"
          >
            <Select
              label="Displayed values"
              defaultSelectedKeys={[DisplayableValue.Transformed]}
              onSelectionChange={(keys) => {
                setDisplayedValue(
                  (keys as Set<DisplayableValue>).values().next().value!
                );
              }}
            >
              <SelectItem key={DisplayableValue.Transformed}>
                Transformed
              </SelectItem>
              <SelectItem key={DisplayableValue.Retransformed}>
                Retransformed
              </SelectItem>
            </Select>
            <Input
              type="number"
              label="Delay in seconds"
              placeholder="1"
              value={delay.toString()}
              min={0}
              onValueChange={(v) => {
                if (v.includes(".")) v = v.split(".")[0];
                setDelay(Number(v));
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
