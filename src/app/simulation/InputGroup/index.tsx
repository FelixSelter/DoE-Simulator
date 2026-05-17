import { useEffect, useRef, useState } from "react";

import { Slider } from "@heroui/slider";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import Heading from "@/components/Heading";
import { ErrorMsg } from "@/util/UserMsgSystem";
import { FactorSettings } from "@/util/GlobalState";
import { useContextSelector } from "use-context-selector";
import NumberInput from "@/components/NumberInput";

interface Props {
  factor: FactorSettings;
}

export default function Index({ factor }: Props) {
  const { globalState, setGlobalState } = useContextSelector(
    GlobalStateContext,
    ({ globalState, setGlobalState }) => ({
      globalState: {
        simulationFactorValues: globalState.simulationFactorValues,
        livePreview: globalState.livePreview,
      },
      setGlobalState,
    }),
  );

  if (!globalState.simulationFactorValues.current.has(factor.formulaSymbol))
    globalState.simulationFactorValues.current.set(
      factor.formulaSymbol,
      factor?.defaultValue || 0,
    );

  const [value, setValue] = useState(
    globalState.simulationFactorValues.current.get(factor.formulaSymbol)!,
  );

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (inputRef.current === null) return;
    const input = inputRef.current.querySelector("input")!;
    input.tabIndex = -1;
  }, []);

  useEffect(() => {
    if (factor === undefined) return;

    globalState.simulationFactorValues.current.set(factor.formulaSymbol, value);
  }, [value, globalState, factor]);

  useEffect(() => {
    if (!globalState.livePreview) return;
    setGlobalState((prev) => ({
      ...prev,
      updatedFactors: prev.updatedFactors + 1,
    }));
  }, [value]);

  const step = Math.pow(0.1, factor.numDecimalPlaces);

  return (
    <>
      <Heading title={factor.name} />
      <NumberInput
        ariaLabel={`Input control of ${factor.name}`}
        value={value}
        min={factor.minValue}
        max={factor.maxValue}
        numDecimalPlaces={factor.numDecimalPlaces}
        onChange={(v) => {
          if (typeof v === "number") setValue(v);
          ErrorMsg.setError(
            `SimulationInputInvalid ${factor.formulaSymbol}`,
            `The input for factor "${factor.name} (${factor.formulaSymbol})" is invalid.`,
            typeof v !== "number",
          );
        }}
      />
      <Slider
        aria-label={`Alternative Slider control of ${factor.name}`}
        ref={inputRef}
        minValue={factor.minValue}
        maxValue={factor.maxValue}
        value={value}
        onChange={(v) => {
          const num = Number((v as number).toFixed(factor.numDecimalPlaces));
          ErrorMsg.clearError(`SimulationInputInvalid ${factor.formulaSymbol}`);
          setValue(num);
        }}
        step={step}
      />
    </>
  );
}
