import React, { forwardRef, useContext, useEffect, useState } from "react";

import { Input } from "@nextui-org/input";
import { Slider } from "@nextui-org/react";
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
      (factor) => factor.formulaSymbol === formulaSymbol
    );

    const [value, setValue] = useState(factor?.defaultValue || 0);

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
          type="number"
          placeholder="0"
          min={factor.minValue}
          max={factor.maxValue}
          value={value.toString()}
          onChange={(e) => setValue(Number(e.target.value))}
          step={step}
        />
        <Slider
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
  }
);
Index.displayName = "InputGroup";

export default Index;
