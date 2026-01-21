import { forwardRef, useContext, useEffect, useRef, useState } from "react";

import { Input } from "@heroui/input";
import { Slider } from "@heroui/slider";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import Heading from "@/components/Heading";

interface Props {
  formulaSymbol: string;
}

const Index = forwardRef<Map<string, number>, Props>(
  //TODO: lint error???
  // eslint-disable-next-line react/prop-types
  ({ formulaSymbol }, ref) => {
    const { globalState } = useContext(GlobalStateContext);

    const factor = globalState.factors.find(
      (factor) => factor.formulaSymbol === formulaSymbol,
    );

    const [value, setValue] = useState(factor?.defaultValue || 0);

    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      if (inputRef.current === null) return;
      const input = inputRef.current.querySelector("input")!;
      input.tabIndex = -1;
    }, []);

    useEffect(() => {
      if (ref === null || factor === undefined) return;

      if (typeof ref === "function") throw new NotImplementedError();
      ref.current = new Map(ref.current).set(factor.formulaSymbol, value);
    }, [value, ref, factor]);

    if (factor === undefined) return <span>TODO: Handle error</span>;
    const step = Math.pow(0.1, factor.numDecimalPlaces);

    return (
      <>
        <Heading title={factor.name} />
        <Input
          lang="en"
          type="number"
          min={factor.minValue}
          max={factor.maxValue}
          value={value.toString()}
          onChange={(e) => setValue(Number(e.target.value))}
          step={step}
        />
        <Slider
          ref={inputRef}
          minValue={factor.minValue}
          maxValue={factor.maxValue}
          value={value}
          onChange={(v) =>
            setValue(Number((v as number).toFixed(factor.numDecimalPlaces)))
          }
          step={step}
        />
      </>
    );
  },
);
Index.displayName = "InputGroup";

export default Index;
