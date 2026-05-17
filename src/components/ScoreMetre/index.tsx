import styles from "./index.module.css";
import Heading from "../Heading";
import {
  GlobalState,
  RetransformedTargetSettings,
  TargetSettings,
} from "@/util/GlobalState";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import { useContextSelector } from "use-context-selector";
import {
  evaluateRetransformed,
  evaluateTransformed,
} from "@/app/simulation/page";
import { useEffect, useState } from "react";

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
  >,
  target: Props["target"],
): number {
  // Live preview mode so calculate the value based on the current factor values and the transform/retransform equations instead of using measurements
  // Avoid running with empty initial factors because of formula evaluation errors. Dont know why this is called when the formula but not the factors are set
  if (
    globalState.livePreview &&
    globalState.simulationFactorValues.current.size > 0
  ) {
    const measurementData = new Map(globalState.simulationFactorValues.current);
    for (const [
      key,
      value,
    ] of globalState.simulationFactorValues.current.entries())
      measurementData.set(`${key}_raw`, value);

    evaluateTransformed(measurementData, globalState);
    if (globalState.retransformEquation)
      evaluateRetransformed(measurementData, globalState);
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
      },
    }),
  );

  const measuredValues = globalState.measurements.map(
    (m) => m[target.formulaSymbol] as number,
  );
  const minValue = Math.min(0, ...measuredValues, ...target.limits);
  const maxValue = Math.max(100, ...measuredValues, ...target.limits);
  const min = minValue - (maxValue - minValue) * 0.1;
  const max = maxValue + (maxValue - minValue) * 0.1;

  console.assert(min <= max, "ScoreMetre: min is not less than max");
  console.assert(
    measuredValues.every((value) => value >= min && value <= max),
    "ScoreMetre: some measurements are out of range",
  );

  const [value, setValue] = useState(0);
  const fillPercentage = calculateFillPercentage(min, max, value);
  const numberFormatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: target.numDecimalPlaces,
    maximumFractionDigits: target.numDecimalPlaces,
  });

  // calculateValue might create a FailureMsg causing a setState during render, so we need to call it inside useEffect
  useEffect(() => {
    setValue(calculateValue(globalState, target));
  }, [
    globalState.measurements,
    globalState.livePreview,
    globalState.simulationFactorValues,
    globalState.targets,
    globalState.transformEquation,
    globalState.retransformEquation,
    globalState.retransformedTargets,
    target.formulaSymbol,
  ]);

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
