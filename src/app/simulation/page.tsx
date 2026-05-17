"use client";

import { useRef, useState } from "react";
import styles from "./page.module.css";
import ScoreMetre from "@/components/ScoreMetre";
import { Input } from "@heroui/input";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import InputGroup from "./InputGroup";
import {
  DeviationType,
  GlobalState,
  Measurement,
  NoiseType,
} from "@/util/GlobalState";
import { normalRandom, uniformRandom } from "@/util/Math";
import { Select, SelectItem } from "@heroui/select";
import {
  ErrorMsg,
  ErrorMsgKeys,
  FailureMsg,
  ProgressInfo,
} from "@/util/UserMsgSystem";
import { useContextSelector } from "use-context-selector";
import NumberInput, { NumberInputError } from "@/components/NumberInput";
import assert from "assert";

enum DisplayableValue {
  Transformed = "transformed",
  Retransformed = "retransformed",
}

function safeEvaluationScope(scope: Map<string, unknown>): {
  scope: Map<string, unknown>;
  missingSymbols: Set<string>;
} {
  const missingSymbols = new Set<string>();

  const proxy = new Proxy(scope, {
    get(target, prop: string) {
      if (prop === "get") {
        return (key: string) => {
          if (!target.has(key)) {
            missingSymbols.add(key);

            // optional fallback
            target.set(key, 0);
          }

          return target.get(key);
        };
      }

      if (prop === "has") {
        return (key: string) => {
          if (key !== "end" && !target.has(key)) {
            missingSymbols.add(key);

            // fake existence
            target.set(key, 0);
            return true;
          }

          return target.has(key);
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (target as any)[prop];
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

  return {
    scope: proxy,
    missingSymbols,
  };
}

/**
 * Checks whether the simulation can be executed.
 * If not, shows appropriate error messages.
 * @param globalState
 * @param isRunning
 * @returns true if the simulation can be executed, false otherwise
 */
function checkExecutionPreconditions(
  globalState: Pick<
    GlobalState,
    | "transformEquation"
    | "spendMoney"
    | "replicationsPerTrial"
    | "costPerRun"
    | "maxBudget"
  >,
  isRunning: boolean,
): boolean {
  if (isRunning) {
    new FailureMsg("Please wait for your other trials to finish");
    return false;
  }

  ErrorMsg.setError(
    ErrorMsgKeys.NoTransformFormula,
    "No transform equation has been specified in settings",
    globalState.transformEquation === undefined,
  );
  // Allow running the simulation without a retransform formula
  // ErrorMsg.setError(
  //   ErrorMsgKeys.NoRetransformFormula,
  //   "No retransform equation has been specified in settings",
  //   globalState.retransformEquation === undefined,
  // );

  if (ErrorMsg.isInErrorState()) {
    new FailureMsg("Please fix the errors before starting a trial");
    return false;
  }

  if (
    globalState.spendMoney +
      globalState.replicationsPerTrial * globalState.costPerRun >
    globalState.maxBudget
  ) {
    new FailureMsg(
      "You cannot do more trials because you have run out of money",
    );
    return false;
  }
  return true;
}

function applyMonteCarlo(
  measurementData: Map<string, number>,
  globalState: Pick<GlobalState, "factors" | "simulationFactorValues">,
) {
  ErrorMsg.clearError(ErrorMsgKeys.UnknownNoiseType);
  for (const factor of globalState.factors) {
    if (factor.deviation == 0) continue;

    let randomFunction;
    switch (factor.noiseType) {
      case NoiseType.UniformWhiteNoise:
        randomFunction = uniformRandom;
        break;
      case NoiseType.GaussianWhiteNoise:
        randomFunction = normalRandom;
        break;

      default:
        ErrorMsg.setError(
          ErrorMsgKeys.UnknownNoiseType,
          `Unsupported noise function (${factor.noiseType}). Please contact a developer`,
        );
        throw new NotImplementedError();
    }

    ErrorMsg.clearError(ErrorMsgKeys.UnknownDeviationType);
    const mean = globalState.simulationFactorValues.current.get(
      factor.formulaSymbol,
    )!;
    let randomOffset;
    switch (factor.deviationType) {
      case DeviationType.Absolute:
        randomOffset = randomFunction(-factor.deviation, factor.deviation);
        break;

      case DeviationType.Percentage: {
        const absolute = (factor.deviation / 100) * mean;
        randomOffset = randomFunction(-absolute, absolute);
        break;
      }

      case DeviationType.VarianceCoefficient: {
        assert(
          factor.noiseType === NoiseType.GaussianWhiteNoise,
          "VarianceCoefficient deviation type only works with Gaussian noise",
        );
        const standardDeviation = (mean * factor.deviation) / 100;
        const range = 4 * standardDeviation; // 95% of values within [mean - 2*stdDev, mean + 2*stdDev]
        randomOffset = normalRandom(-range / 2, range / 2);
        break;
      }

      default:
        ErrorMsg.setError(
          ErrorMsgKeys.UnknownDeviationType,
          `Unsupported deviation type (${factor.noiseType}). Please contact a developer`,
        );
        throw new NotImplementedError();
    }

    measurementData.set(
      factor.formulaSymbol,
      measurementData.get(factor.formulaSymbol)! + randomOffset,
    );
  }
}

export function evaluateTransformed(
  measurementData: Map<string, number>,
  globalState: Pick<GlobalState, "targets" | "transformEquation">,
) {
  const { scope: safeScope, missingSymbols } =
    safeEvaluationScope(measurementData);
  const transformResult = globalState.transformEquation.evaluate(safeScope);
  ErrorMsg.setError(
    ErrorMsgKeys.MissingSymbolsInTransformEquation,
    `Did you load a corrupted file? The transform equation references the following undefined symbols: ${Array.from(
      missingSymbols,
    ).join(", ")}. Please fix this before running the simulation.`,
    missingSymbols.size > 0,
  );

  if (typeof transformResult === "number") {
    measurementData.set(
      globalState.targets[0].formulaSymbol,
      transformResult as number,
    );
  } else {
    for (let i = 0; i < globalState.targets.length; i++)
      measurementData.set(
        globalState.targets[i].formulaSymbol,
        transformResult.entries[i],
      );
  }
}

export function evaluateRetransformed(
  measurementData: Map<string, number>,
  globalState: Pick<
    GlobalState,
    "retransformedTargets" | "retransformEquation"
  >,
) {
  const { scope: safeScope, missingSymbols } =
    safeEvaluationScope(measurementData);
  const retransformResult = globalState.retransformEquation.evaluate(safeScope);
  ErrorMsg.setError(
    ErrorMsgKeys.MissingSymbolsInRetransformEquation,
    `Did you load a corrupted file? The retransform equation references the following undefined symbols: ${Array.from(
      missingSymbols,
    ).join(", ")}. Please fix this before running the simulation.`,
    missingSymbols.size > 0,
  );

  if (typeof retransformResult === "number") {
    measurementData.set(
      globalState.retransformedTargets[0].formulaSymbol,
      retransformResult as number,
    );
  } else {
    for (let i = 0; i < globalState.retransformedTargets.length; i++)
      measurementData.set(
        globalState.retransformedTargets[i].formulaSymbol,
        retransformResult.entries[i],
      );
  }
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
      },
      setGlobalState,
    }),
  );
  const [isRunning, setIsRunning] = useState(false);
  const cancelSimulation = useRef(false);
  const [displayedValue, setDisplayedValue] = useState<DisplayableValue>(
    DisplayableValue.Transformed,
  );

  async function executeTrial() {
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

      const measurementData = new Map(
        globalState.simulationFactorValues.current,
      );
      for (const [
        key,
        value,
      ] of globalState.simulationFactorValues.current.entries())
        measurementData.set(`${key}_raw`, value);

      applyMonteCarlo(measurementData, globalState);
      evaluateTransformed(measurementData, globalState);
      if (globalState.retransformEquation)
        evaluateRetransformed(measurementData, globalState);

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
  }

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
