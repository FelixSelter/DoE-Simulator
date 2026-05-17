import { useEffect, useRef, useState } from "react";

import { Input } from "@heroui/input";
import { Slider } from "@heroui/slider";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import Heading from "@/components/Heading";
import { ErrorMsg } from "@/util/UserMsgSystem";
import { FactorSettings } from "@/util/GlobalState";
import { useContextSelector } from "use-context-selector";

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
  const [textValue, setTextValue] = useState(value.toString());

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

  function isValid(v: string) {
    const num = Number(v);
    return (
      factor!.minValue <= num &&
      num <= factor!.maxValue &&
      factor!.numDecimalPlaces >= (v.split(".")[1]?.length || 0)
    );
  }

  // SetError can change state so it cannot be called in the render function
  useEffect(() => {
    ErrorMsg.setError(
      `SimulationInputInvalid ${factor.formulaSymbol}`,
      `The input for factor "${factor.name} (${factor.formulaSymbol})" is invalid.`,
      !isValid(textValue),
    );
  }, [textValue, factor]);

  return (
    <>
      <Heading title={factor.name} />
      <Input
        aria-label={`Input control of ${factor.name}`}
        lang="en"
        type="text"
        value={textValue}
        isInvalid={!isValid(textValue)}
        onValueChange={(v) => {
          if (isValid(v)) setValue(Number(v));
          setTextValue(v);
        }}
        step={step}
      />
      <Slider
        aria-label={`Alternative Slider control of ${factor.name}`}
        ref={inputRef}
        minValue={factor.minValue}
        maxValue={factor.maxValue}
        value={value}
        onChange={(v) => {
          const num = Number((v as number).toFixed(factor.numDecimalPlaces));
          setValue(num);
          setTextValue(num.toString());
        }}
        step={step}
      />
    </>
  );
}
