import styles from "./index.module.css";
import Heading from "../Heading";
import {
  GlobalState,
  RetransformedTargetSettings,
  TargetSettings,
} from "@/util/GlobalState";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import { useContextSelector } from "use-context-selector";
import { simulateMeasurement } from "@/app/simulation/SimLogic";

interface Props {
  target: TargetSettings | RetransformedTargetSettings;
}

const colors = [
  "rgb(255,0,0)",
  "#48FF00",
  "rgb(0,0,255)",
  "#FF00DD",
  "#7D1D3F",
  "rgb(0,255,255)",
];

function calculateFillPercentage(min: number, max: number, value: number) {
  if (value <= min) return 0;
  if (value >= max) return 100;
  return ((value - min) / (max - min)) * 100;
}

function calculateValue(
  globalState: Pick<
    GlobalState,
    | "measurements"
    | "livePreview"
    | "simulationFactorValues"
    | "targets"
    | "transformEquation"
    | "retransformEquation"
    | "retransformedTargets"
    | "normalDistributionWidth"
  >,
  target: Props["target"],
): number {
  // Live preview mode so calculate the value based on the current factor values and the transform/retransform equations instead of using measurements
  // Avoid running with empty initial factors because of formula evaluation errors. Dont know why this is called when the formula but not the factors are set
  if (
    globalState.livePreview &&
    globalState.simulationFactorValues.current.size > 0
  ) {
    const measurementData = simulateMeasurement(globalState, false);
    return measurementData.get(target.formulaSymbol) as number;
  }

  // No measurements yet, return a default
  if (globalState.measurements.length <= 0) return 50;

  // Last measurement
  return globalState.measurements[globalState.measurements.length - 1][
    target.formulaSymbol
  ] as number;
}

export default function Index({ target }: Props) {
  const { globalState } = useContextSelector(
    GlobalStateContext,
    ({ globalState }) => ({
      globalState: {
        measurements: globalState.measurements,
        showFactorNoiseInChart: globalState.showFactorNoiseInMeasurements,
        livePreview: globalState.livePreview,
        simulationFactorValues: globalState.simulationFactorValues,
        retransformEquation: globalState.retransformEquation,
        retransformedTargets: globalState.retransformedTargets,
        transformEquation: globalState.transformEquation,
        targets: globalState.targets,
        updatedFactors: globalState.updatedFactors,
        normalDistributionWidth: globalState.normalDistributionWidth,
      },
    }),
  );

  const measuredValues = globalState.measurements.map(
    (m) => m[target.formulaSymbol] as number,
  );
  const noData = measuredValues.length === 0 && target.limits.length === 0;
  const minValue = noData ? 0 : Math.min(...measuredValues, ...target.limits);
  const maxValue = noData ? 100 : Math.max(...measuredValues, ...target.limits);
  const min = minValue - (maxValue - minValue) * 0.1;
  const max = maxValue + (maxValue - minValue) * 0.1;

  console.assert(min <= max, "ScoreMetre: min is not less than max");
  console.assert(
    measuredValues.every((value) => value >= min && value <= max),
    "ScoreMetre: some measurements are out of range",
  );

  const value = calculateValue(globalState, target);
  const fillPercentage = calculateFillPercentage(min, max, value);
  const numberFormatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: target.numDecimalPlaces,
    maximumFractionDigits: target.numDecimalPlaces,
  });

  return (
    <section className={styles.container}>
      <Heading
        title={`${target.name} (${value.toFixed(target.numDecimalPlaces)})`}
        textAlign="right"
      />
      <div className={styles.output}>
        <div className={styles.digits}>
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i}>
              {numberFormatter.format(min + (i * (max - min)) / 8)}
            </span>
          ))}
        </div>
        <div />
        <div className={styles.ticks}>
          {Array.from({ length: 41 }).map((_, i) => (
            <hr key={i} />
          ))}
        </div>
        <div
          className={styles.scoreContainer}
          style={{
            background: `linear-gradient(to top, orange ${fillPercentage}%, var(--color4) ${fillPercentage}%, var(--color4) 100%)`,
          }}
        >
          {target.limits.map((limit, i) => {
            return (
              <hr
                key={limit}
                className={styles.extraTick}
                style={{
                  bottom: `${((limit - min) / (max - min)) * 100}%`,
                  background: colors[i % colors.length],
                }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
