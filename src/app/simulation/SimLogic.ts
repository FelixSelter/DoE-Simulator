import { DeviationType, GlobalState, NoiseType } from "@/util/GlobalState";
import { normalRandom, uniformRandom } from "@/util/Math";
import { ErrorMsg, ErrorMsgKeys, FailureMsg } from "@/util/UserMsgSystem";
import assert from "assert";

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
 * Cannot be used during render, because it might create toasts
 * @param globalState
 * @param isRunning
 * @returns true if the simulation can be executed, false otherwise
 */
export function checkExecutionPreconditions(
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

function evaluateFormula(
  type: "transformed" | "retransformed",
  measurementData: Map<string, number>,
  globalState: Pick<
    GlobalState,
    | "targets"
    | "retransformedTargets"
    | "transformEquation"
    | "retransformEquation"
  >,
) {
  const { scope: safeScope, missingSymbols } =
    safeEvaluationScope(measurementData);
  const equation =
    type === "transformed"
      ? globalState.transformEquation
      : globalState.retransformEquation;
  const evaluated = equation.evaluate(safeScope);
  const errorKey =
    type === "transformed"
      ? ErrorMsgKeys.MissingSymbolsInTransformEquation
      : ErrorMsgKeys.MissingSymbolsInRetransformEquation;
  const equationType = type === "transformed" ? "transform" : "retransform";
  ErrorMsg.setError(
    errorKey,
    `Did you load a corrupted file? The ${equationType} equation references the following undefined symbols: ${Array.from(
      missingSymbols,
    ).join(", ")}. Please fix this before running the simulation.`,
    missingSymbols.size > 0,
  );

  const targets =
    type === "transformed"
      ? globalState.targets
      : globalState.retransformedTargets;
  if (typeof evaluated === "number") {
    measurementData.set(targets[0].formulaSymbol, evaluated as number);
  } else {
    for (let i = 0; i < targets.length; i++)
      measurementData.set(targets[i].formulaSymbol, evaluated.entries[i]);
  }
}

type NoiseFunction = (lower: number, upper: number) => number;

/**
 * Must not be called during render, because it might create toasts
 */
function getNoiseFunction(
  normalDistributionWidth: number,
  noiseType: NoiseType,
): NoiseFunction {
  ErrorMsg.clearError(ErrorMsgKeys.UnknownNoiseType);
  switch (noiseType) {
    case NoiseType.UniformWhiteNoise:
      return uniformRandom;
    case NoiseType.GaussianWhiteNoise:
      return (lower: number, upper: number) =>
        normalRandom(lower, upper, normalDistributionWidth);

    default:
      ErrorMsg.setError(
        ErrorMsgKeys.UnknownNoiseType,
        `Unsupported noise function (${noiseType}). Please contact a developer`,
      );
      throw new NotImplementedError();
  }
}

/**
 * Must not be called during render, because it might create toasts
 */
function getNoiseRange(
  normalDistributionWidth: number,
  deviationType: DeviationType,
  deviation: number,
  mean: number,
): [number, number] {
  ErrorMsg.clearError(ErrorMsgKeys.UnknownDeviationType);
  switch (deviationType) {
    case DeviationType.Absolute:
      return [-deviation, deviation];

    case DeviationType.Percentage: {
      const absolute = (deviation / 100) * mean;
      return [-absolute, absolute];
    }

    case DeviationType.VarianceCoefficient: {
      const standardDeviation = (mean * deviation) / 100;
      const rangeWidth = normalDistributionWidth * standardDeviation;
      return [-rangeWidth / 2, rangeWidth / 2];
    }

    default:
      ErrorMsg.setError(
        ErrorMsgKeys.UnknownDeviationType,
        `Unsupported deviation type (${deviationType}). Please contact a developer`,
      );
      throw new NotImplementedError();
  }
}

function applyMonteCarlo(
  measurementData: Map<string, number>,
  globalState: Pick<
    GlobalState,
    "factors" | "simulationFactorValues" | "normalDistributionWidth"
  >,
) {
  for (const factor of globalState.factors) {
    if (factor.deviation == 0) continue;

    assert(
      factor.noiseType === NoiseType.GaussianWhiteNoise ||
        factor.deviationType !== DeviationType.VarianceCoefficient,
      "VarianceCoefficient deviation type only works with Gaussian noise",
    );
    const randomFunction = getNoiseFunction(
      globalState.normalDistributionWidth,
      factor.noiseType,
    );
    const mean = globalState.simulationFactorValues.current.get(
      factor.formulaSymbol,
    )!;
    const [lower, upper] = getNoiseRange(
      globalState.normalDistributionWidth,
      factor.deviationType,
      factor.deviation,
      mean,
    );
    const randomOffset = randomFunction(lower, upper);

    measurementData.set(
      factor.formulaSymbol,
      measurementData.get(factor.formulaSymbol)! + randomOffset,
    );
  }
}

type BaseState = Pick<
  GlobalState,
  | "simulationFactorValues"
  | "retransformEquation"
  | "retransformedTargets"
  | "targets"
  | "transformEquation"
  | "normalDistributionWidth"
>;

type MonteCarloState = Pick<GlobalState, "factors">;

// Only require factors if monte carlo is enabled
export function simulateMeasurement<TWithMonteCarlo extends boolean>(
  globalState: TWithMonteCarlo extends true
    ? BaseState & MonteCarloState
    : BaseState,
  withMonteCarlo: TWithMonteCarlo,
): Map<string, number> {
  const measurementData = new Map(globalState.simulationFactorValues.current);
  for (const [
    key,
    value,
  ] of globalState.simulationFactorValues.current.entries())
    measurementData.set(`${key}_raw`, value);

  if (withMonteCarlo)
    applyMonteCarlo(
      measurementData,
      globalState as BaseState & MonteCarloState,
    );

  evaluateFormula("transformed", measurementData, globalState);
  if (globalState.retransformEquation)
    evaluateFormula("retransformed", measurementData, globalState);

  return measurementData;
}
