"use client";

import { TargetSettings } from "@/util/GlobalState";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import { useState } from "react";
import styles from "./index.module.css";
import Heading from "@/components/Heading";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import Plus from "@/util/icons/Plus";
import Trash from "@/util/icons/Trash";
import ScoreMetre from "@/components/ScoreMetre";
import { Listbox, ListboxSection, ListboxItem } from "@heroui/listbox";
import { ErrorMsg, FailureMsg } from "@/util/UserMsgSystem";
import { numRegex } from "@/util/Util";
import { useContextSelector } from "use-context-selector";
import NumberInput from "@/components/NumberInput";

interface Props {
  target: TargetSettings;
}

export default function Index({ target }: Props) {
  const { setGlobalState } = useContextSelector(
    GlobalStateContext,
    ({ setGlobalState }) => ({ setGlobalState }),
  );
  const [newLimit, setNewLimit] = useState("0");

  /**Onclick listener for target settings form.
   * Updates the global settings of a target.
   *
   * @param label The key of the target settings to be changed
   * @param value The new value of the setting
   */
  function onChange<K extends keyof TargetSettings>(
    label: K,
    value: TargetSettings[K],
  ) {
    setGlobalState((previousState) => {
      const updated = [...previousState.targets];
      const index = updated.findIndex((t) => t == target);
      console.assert(index !== -1, "TargetSettingsInput: onChange index -1");

      updated[index] = {
        ...updated[index],
        [label]: value,
      };

      return {
        ...previousState,
        targets: updated,
      };
    });
  }

  return (
    <div key={target.formulaSymbol} className="flex flex-col">
      <div className={styles.container}>
        <Heading title={target.formulaSymbol} />

        <Input
          lang="en"
          type="text"
          label="Name target"
          onValueChange={(v) => onChange("name", v)}
          value={target.name}
        />
        <NumberInput
          label="Number of decimal places"
          errorMessage="The number of decimal places must be an integer between 0 and 20"
          onChange={(v) => {
            const valid = typeof v === "number";
            if (valid) onChange("numDecimalPlaces", v);
            ErrorMsg.setError(
              `TargetsInvalidDecimalPlaces ${target.formulaSymbol}`,
              `The number of decimal places for target ${target.name} (${target.formulaSymbol}) must be an integer between 0 and 20`,
              !valid,
            );
          }}
          defaultValue={target.numDecimalPlaces}
        />
        <div className="border-small rounded-small border-default-200 dark:border-default-100">
          <div style={{ padding: "0.25rem" }}>
            <span className="pl-1 text-tiny text-foreground-500">
              Create limit
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0.375rem",
                gap: "10px",
              }}
            >
              <Input
                lang="en"
                type="text"
                value={newLimit}
                isInvalid={!numRegex.test(newLimit)}
                onValueChange={setNewLimit}
                aria-label="input for the new limit"
              />
              <Button
                aria-label="add new limit"
                isIconOnly
                className="p-2"
                color="success"
                size="sm"
                onPress={() => {
                  if (!numRegex.test(newLimit)) {
                    new FailureMsg(`The limit must be a valid number`);
                    return;
                  }
                  const num = Number(newLimit);
                  if (!target.limits.includes(num))
                    onChange("limits", [num, ...target.limits]);
                }}
              >
                <Plus />
              </Button>
            </div>
          </div>

          <Listbox aria-label={`currently active limits for ${target.name}`}>
            <ListboxSection title="Limits">
              {target.limits.map((limit) => (
                <ListboxItem
                  key={limit}
                  textValue={limit.toString()}
                  endContent={
                    <Button
                      aria-label={`delete limit ${limit} from ${target.name}`}
                      isIconOnly
                      className="p-2"
                      color="danger"
                      size="sm"
                      onPress={() =>
                        onChange(
                          "limits",
                          target.limits.filter((l) => l !== limit),
                        )
                      }
                    >
                      <Trash />
                    </Button>
                  }
                  showDivider
                >
                  {limit}
                </ListboxItem>
              ))}
            </ListboxSection>
          </Listbox>
        </div>
      </div>
      {/*Vertical alignment of the score metre for different amounts of targets*/}
      <div className="grow"></div>
      <div style={{ minHeight: "30vh" }}>
        <ScoreMetre target={target} />
      </div>
    </div>
  );
}
