import React, { useState } from "react";
import { Input } from "@heroui/input";
import styles from "./index.module.css";
import { Select, SelectItem } from "@heroui/select";
import { DeviationType, FactorSettings, NoiseType } from "@/util/GlobalState";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import Heading from "@/components/Heading";
import { ErrorMsg } from "@/util/UserMsgSystem";
import { numRegex } from "@/util/Util";
import { useContextSelector } from "use-context-selector";

interface Props {
  factor: FactorSettings;
}

/** The FactorSettingsInput Component allows to change the settings of a factor
 */
export default function Index({ factor }: Props) {
  const { setGlobalState } = useContextSelector(
    GlobalStateContext,
    ({ setGlobalState }) => ({ setGlobalState }),
  );
  const [numDecimalPlacesInvalid, setNumDecimalPlacesInvalid] = useState(false);

  /**Onclick listener for factor settings form.
   * Updates the global settings of a factor.
   *
   * @param label The key of the factor settings to be changed
   * @param value The new value of the setting
   */
  function onChange<K extends keyof FactorSettings>(
    label: K,
    value: FactorSettings[K],
  ) {
    setGlobalState((previousState) => {
      const updated = [...previousState.factors];
      const index = updated.findIndex((f) => f == factor);
      console.assert(index !== -1, "FactorSettingsInput: onChange index -1");

      updated[index] = {
        ...updated[index],
        [label]: value,
      };

      return {
        ...previousState,
        factors: updated,
      };
    });

    //Cannot move code below into setState because it will be executed twice
    factor[label] = value;

    //ensure max is above min
    ErrorMsg.setError(
      `FactorMaxIsNotAboveMin-${factor.formulaSymbol}`,
      `Your max value for ${factor.name} (${factor.formulaSymbol}) must be above min value`,
      factor.maxValue <= factor.minValue,
    );

    //ensure defaultValue is in allowed range
    ErrorMsg.setError(
      `FactorDefaultNotBetweenMaxAndMin-${factor.formulaSymbol}`,
      `Your default value for ${factor.name} (${factor.formulaSymbol}) must be in between min and max value`,
      factor.defaultValue < factor.minValue ||
        factor.defaultValue > factor.maxValue,
    );
  }

  return (
    <div className={styles.container}>
      <Heading title={factor.formulaSymbol} />
      <Input
        lang="en"
        type="text"
        label="Name factor"
        onValueChange={(v) => onChange("name", v)}
        value={factor.name}
      />
      <Input
        lang="en"
        type="text"
        label="Min value"
        defaultValue={factor.minValue.toString()}
        onValueChange={(v) => {
          const valid = numRegex.test(v);
          if (valid) onChange("minValue", Number(v));
          ErrorMsg.setError(
            `FactorsInvalidMin ${factor.formulaSymbol}`,
            `The min value for factor ${factor.name} (${factor.formulaSymbol}) must be a valid number`,
            !valid,
          );
        }}
      />
      <Input
        lang="en"
        type="text"
        label="Default value"
        isInvalid={
          factor.defaultValue < factor.minValue ||
          factor.defaultValue > factor.maxValue
        }
        errorMessage="The default value must be between the min and max values"
        defaultValue={factor.defaultValue.toString()}
        onValueChange={(v) => {
          const valid = numRegex.test(v);
          if (valid) onChange("defaultValue", Number(v));
          ErrorMsg.setError(
            `FactorsInvalidDefault ${factor.formulaSymbol}`,
            `The default value for factor ${factor.name} (${factor.formulaSymbol}) must be a valid number`,
            !valid,
          );
        }}
      />
      <Input
        lang="en"
        type="text"
        label="Max value"
        isInvalid={factor.minValue > factor.maxValue}
        errorMessage="The max value must be greater than or equal to the min value"
        defaultValue={factor.maxValue.toString()}
        onValueChange={(v) => {
          const valid = numRegex.test(v);
          if (valid) onChange("maxValue", Number(v));
          ErrorMsg.setError(
            `FactorsInvalidMax ${factor.formulaSymbol}`,
            `The max value for factor ${factor.name} (${factor.formulaSymbol}) must be a valid number`,
            !valid,
          );
        }}
      />
      <Input
        lang="en"
        type="text"
        label="Number of decimal places"
        isInvalid={numDecimalPlacesInvalid}
        errorMessage="The number of decimal places must be an integer between 0 and 20"
        onValueChange={(v) => {
          const num = Number(v);
          const valid = num >= 0 && num <= 20 && Number.isInteger(num);
          setNumDecimalPlacesInvalid(!valid);
          if (valid) onChange("numDecimalPlaces", num);
          ErrorMsg.setError(
            `FactorsInvalidDecimalPlaces ${factor.formulaSymbol}`,
            `The number of decimal places for factor ${factor.name} (${factor.formulaSymbol}) must be an integer between 0 and 20`,
            !valid,
          );
        }}
        defaultValue={factor.numDecimalPlaces.toString()}
      />
      <Select
        label="Deviation type"
        onSelectionChange={(v) =>
          onChange(
            "deviationType",
            (v as Set<DeviationType>).values().next().value!,
          )
        }
        selectedKeys={[factor.deviationType]}
      >
        {Object.values(DeviationType).map((deviationType) => (
          <SelectItem key={deviationType}>{deviationType}</SelectItem>
        ))}
      </Select>
      <Input
        lang="en"
        type="number"
        label="Deviation"
        onValueChange={(v) => onChange("deviation", Number(v))}
        value={factor.deviation.toString()}
      />
      <Select
        label="Noise type"
        onSelectionChange={(v) =>
          onChange("noiseType", (v as Set<NoiseType>).values().next().value!)
        }
        selectedKeys={[factor.noiseType]}
      >
        {Object.values(NoiseType).map((noiseType) => (
          <SelectItem key={noiseType}>{noiseType}</SelectItem>
        ))}
      </Select>
    </div>
  );
}
