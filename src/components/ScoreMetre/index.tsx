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

interface Props {
  target: TargetSettings | RetransformedTargetSettings;
}

const colors = [
  "hsl(var(--nextui-primary))",
  "hsl(var(--nextui-secondary))",
  "hsl(var(--nextui-success))",
  "hsl(var(--nextui-danger))",
];

function calculateFillPercentage(min: number, max: number, value: number) {
  if (value <= min) return 0;
  if (value >= max) return 100;
  return ((value - min) / (max - min)) * 100;
}

function getValue(
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
  if (globalState.livePreview) {
    const measurementData = new Map(globalState.simulationFactorValues.current);
    evaluateTransformed(measurementData, globalState);
    if (globalState.retransformEquation)
      evaluateRetransformed(measurementData, globalState);
    return measurementData.get(target.formulaSymbol) as number;
  }

  if (globalState.measurements.length <= 0) return 50;

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

  const minLimit = target.limits.length > 0 ? Math.min(...target.limits) : 0;
  const maxLimit = target.limits.length > 0 ? Math.max(...target.limits) : 100;
  const min = minLimit - (maxLimit - minLimit) * 0.1;
  const max = maxLimit + (maxLimit - minLimit) * 0.1;

  console.assert(min <= max, "ScoreMetre: min is not less than max");
  console.assert(
    target.limits.every((limit) => limit >= min && limit <= max),
    "ScoreMetre: some limits are out of range",
  );

  const value = getValue(globalState, target);
  const fillPercentage = calculateFillPercentage(min, max, value);

  return (
    <section className={styles.container}>
      <Heading title={target.name} textAlign="right" />
      <div className={styles.output}>
        <div className={styles.digits}>
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i}>
              {Math.round((min + (i * (max - min)) / 8) * 1000) / 1000}
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
          {target.limits.map((limit, i) => (
            <hr
              key={limit}
              className={styles.extraTick}
              style={{
                bottom: `${((limit - min) / (max - min)) * 100}%`,
                border: `1px solid ${colors[i % colors.length]}`,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
