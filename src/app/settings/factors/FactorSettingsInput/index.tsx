import React, { useContext } from "react";
import { Input } from "@nextui-org/input";
import styles from "./index.module.css";
import { Select, SelectItem } from "@nextui-org/react";
import { DeviationType, FactorSettings, NoiseType } from "@/util/GlobalState";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import Heading from "@/components/Heading";
import { ErrorMsg } from "@/util/UserMsgSystem";

interface Props {
  factor: FactorSettings;
}

/** The FactorSettingsInput Component allows to change the settings of a factor
 */
export default function Index({ factor }: Props) {
  const { setGlobalState } = useContext(GlobalStateContext);

  /**Onclick listener for factor settings form.
   * Updates the global settings of a factor.
   *
   * @param label The key of the factor settings to be changed
   * @param value The new value of the setting
   */
  function onChange<K extends keyof FactorSettings>(
    label: K,
    value: FactorSettings[K]
  ) {
    setGlobalState((previousState) => {
      const updated = [...previousState.factors];
      const index = updated.findIndex((f) => f == factor);

      console.assert(index !== -1);
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
      factor.maxValue <= factor.minValue
    );

    //ensure defaultValue is in allowed range
    ErrorMsg.setError(
      `FactorDefaultNotBetweenMaxAndMin-${factor.formulaSymbol}`,
      `Your default value for ${factor.name} (${factor.formulaSymbol}) must be in between min and max value`,
      factor.defaultValue < factor.minValue ||
        factor.defaultValue > factor.maxValue
    );
  }

  return (
    <div className={styles.container}>
      <Heading title={factor.formulaSymbol} />
      <Input
        type="text"
        label="Name factor"
        onValueChange={(v) => onChange("name", v)}
        value={factor.name}
      />
      <Input
        type="number"
        label="Min value"
        onValueChange={(v) => onChange("minValue", Number(v))}
        value={factor.minValue.toString()}
      />
      <Input
        type="number"
        label="Default value"
        onValueChange={(v) => onChange("defaultValue", Number(v))}
        value={factor.defaultValue.toString()}
      />
      <Input
        type="number"
        label="Max value"
        onValueChange={(v) => onChange("maxValue", Number(v))}
        value={factor.maxValue.toString()}
      />
      <Input
        type="number"
        label="Number of decimal places"
        min={0}
        max={20}
        onValueChange={(v) => onChange("numDecimalPlaces", Number(v))}
        value={factor.numDecimalPlaces.toString()}
      />
      <Select
        label="Deviation type"
        onSelectionChange={(v) =>
          onChange(
            "deviationType",
            (v as Set<DeviationType>).values().next().value!
          )
        }
        selectedKeys={[factor.deviationType]}
      >
        {Object.values(DeviationType).map((deviationType) => (
          <SelectItem key={deviationType}>{deviationType}</SelectItem>
        ))}
      </Select>
      <Input
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
