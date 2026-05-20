"use client";

import { useCallback, useRef, useState } from "react";
import styles from "./page.module.css";
import ScoreMetre from "@/components/ScoreMetre";
import { Input } from "@heroui/input";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import InputGroup from "./InputGroup";
import { Measurement } from "@/util/GlobalState";
import { Select, SelectItem } from "@heroui/select";
import {
  ErrorMsg,
  ErrorMsgKeys,
  FailureMsg,
  ProgressInfo,
} from "@/util/UserMsgSystem";
import { useContextSelector } from "use-context-selector";
import NumberInput, { NumberInputError } from "@/components/NumberInput";
import { checkExecutionPreconditions, simulateMeasurement } from "./SimLogic";

enum DisplayableValue {
  Transformed = "transformed",
  Retransformed = "retransformed",
}

export default function Page() {
  const { globalState, setGlobalState } = useContextSelector(
    GlobalStateContext,
    ({ globalState, setGlobalState }) => ({
      globalState: {
        trialCounter: globalState.trialCounter,
        spendMoney: globalState.spendMoney,
        replicationsPerTrial: globalState.replicationsPerTrial,
        simulationFactorValues: globalState.simulationFactorValues,
        factors: globalState.factors,
        targets: globalState.targets,
        retransformedTargets: globalState.retransformedTargets,
        transformEquation: globalState.transformEquation,
        retransformEquation: globalState.retransformEquation,
        delay: globalState.delay,
        costPerRun: globalState.costPerRun,
        maxBudget: globalState.maxBudget,
        runCounter: globalState.runCounter,
        normalDistributionWidth: globalState.normalDistributionWidth,
      },
      setGlobalState,
    }),
  );
  const [isRunning, setIsRunning] = useState(false);
  const cancelSimulation = useRef(false);
  const [displayedValue, setDisplayedValue] = useState<DisplayableValue>(
    DisplayableValue.Transformed,
  );

  const executeTrial = useCallback(async () => {
    if (!checkExecutionPreconditions(globalState, isRunning)) return;

    const noUIUpdates = globalState.delay === 0;
    if (noUIUpdates && globalState.replicationsPerTrial > 100)
      new FailureMsg(
        "Updating the charts only every 5% because delay is set to 0 seconds.",
      );

    let measurementsAccumulator: Measurement[] = [];
    const percentageStep = Math.round(globalState.replicationsPerTrial / 20);

    setIsRunning(true);
    cancelSimulation.current = false;
    const trial = globalState.trialCounter + 1;
    let runNumber = globalState.runCounter;

    const progressInfo = new ProgressInfo(
      `0% Rep 0/${globalState.replicationsPerTrial} of trial ${trial}`,
    );
    for (
      let replication = 1;
      replication <= globalState.replicationsPerTrial;
      replication++
    ) {
      const shouldUpdateUI =
        !noUIUpdates ||
        replication % percentageStep === 0 ||
        replication === globalState.replicationsPerTrial;

      if (shouldUpdateUI) {
        progressInfo.setMsg(
          `${Math.round((replication / globalState.replicationsPerTrial) * 100)}% Rep ${replication}/${globalState.replicationsPerTrial} of trial ${trial}`,
        );
        progressInfo.setProgress(
          replication / globalState.replicationsPerTrial,
        );
      }

      const measurementData = simulateMeasurement(globalState, true);
      const measurement: Measurement = {
        key: `${trial}-${replication}`,
        Run: runNumber++,
        Trial: trial,
        Rep: replication,
        ...Object.fromEntries(measurementData),
      };

      measurementsAccumulator.push(measurement);

      if (shouldUpdateUI) {
        // Copy this before resetting the accumulator to [] because setState is async and we don't want to lose the reference to the measurements
        const batch = measurementsAccumulator;

        setGlobalState((oldState) => {
          return {
            ...oldState,
            trialCounter: trial,
            spendMoney:
              oldState.spendMoney + batch.length * oldState.costPerRun,
            measurements: [...oldState.measurements, ...batch],
            runCounter: runNumber,
          };
        });

        measurementsAccumulator = [];
      }

      if (cancelSimulation.current) {
        new FailureMsg("Simulation cancelled.");
        break;
      }

      //Delay
      await new Promise((resolve) =>
        setTimeout(resolve, globalState.delay * 1000),
      );
    }
    setIsRunning(false);
    progressInfo.clear();
  }, [globalState, setGlobalState, isRunning]);

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
            <InputGroup factor={factor} />
          </div>
        ))}
      </div>
      <div className={styles.controlsContainer}>
        <Input
          lang="en"
          type="text"
          label="Simulated Trials"
          isReadOnly
          value={globalState.trialCounter.toString()}
        />
        <Input
          lang="en"
          type="text"
          label="Cost"
          isReadOnly
          value={globalState.spendMoney.toString()}
          startContent={
            <div className="pointer-events-none flex items-center">
              <span className="text-default-400 text-small">€</span>
            </div>
          }
        />
        <Input
          lang="en"
          type="number"
          label="Replications per Trial"
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
          <button
            className={styles.trialButton}
            onClick={() => {
              if (isRunning) cancelSimulation.current = true;
              else executeTrial();
            }}
          >
            {isRunning ? "Abort" : "Run"}
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
                  (keys as Set<DisplayableValue>).values().next().value!,
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
            <NumberInput
              label="Delay in seconds"
              value={globalState.delay}
              min={0}
              numDecimalPlaces={2}
              onChange={(v) => {
                if (typeof v === "number") {
                  setGlobalState((oldState) => ({
                    ...oldState,
                    delay: Number(v),
                  }));
                  ErrorMsg.clearError(ErrorMsgKeys.InvalidDelay);
                  return;
                }

                switch (v) {
                  case NumberInputError.CANNOT_PARSE:
                    ErrorMsg.setError(
                      ErrorMsgKeys.InvalidDelay,
                      "Please enter a valid number for the delay",
                    );
                    break;
                  case NumberInputError.TO_SMALL:
                    ErrorMsg.setError(
                      ErrorMsgKeys.InvalidDelay,
                      "The delay cannot be negative",
                    );
                    break;
                  default:
                    ErrorMsg.setError(
                      ErrorMsgKeys.InvalidDelay,
                      "Unknown error. Please contact a developer",
                    );
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
