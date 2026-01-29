"use client";

import {
  RetransformedTargetSettings,
  TargetSettings,
} from "@/util/GlobalState";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import React, { useState } from "react";
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

interface Props {
  target: RetransformedTargetSettings;
}
export default function Index({ target: retransformed }: Props) {
  const { setGlobalState } = useContextSelector(
    GlobalStateContext,
    ({ setGlobalState }) => ({ setGlobalState }),
  );
  const [newLimit, setNewLimit] = useState("0");
  const [numDecimalPlacesInvalid, setNumDecimalPlacesInvalid] = useState(false);

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
      const updated = [...previousState.retransformedTargets];
      const index = updated.findIndex((t) => t == retransformed);
      console.assert(
        index !== -1,
        "RetransformedTargetSettingsInput: onChange index -1",
      );

      updated[index] = {
        ...updated[index],
        [label]: value,
      };

      return {
        ...previousState,
        retransformedTargets: updated,
      };
    });
  }

  return (
    <div key={retransformed.formulaSymbol}>
      <div className={styles.container}>
        <Heading title={retransformed.formulaSymbol} />

        <Input
          lang="en"
          type="text"
          label="Name retransformed target"
          onValueChange={(v) => onChange("name", v)}
          value={retransformed.name}
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
              `TargetsInvalidDecimalPlaces ${retransformed.formulaSymbol}`,
              `The number of decimal places for target ${retransformed.name} (${retransformed.formulaSymbol}) must be an integer between 0 and 20`,
              !valid,
            );
          }}
          defaultValue={retransformed.numDecimalPlaces.toString()}
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
                defaultValue={newLimit}
                onValueChange={setNewLimit}
                isInvalid={!numRegex.test(newLimit)}
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
                  if (!retransformed.limits.includes(num))
                    onChange("limits", [num, ...retransformed.limits]);
                }}
              >
                <Plus />
              </Button>
            </div>
          </div>

          <Listbox
            aria-label={`currently active limits for ${retransformed.name}`}
          >
            <ListboxSection title="Limits">
              {retransformed.limits.map((limit) => (
                <ListboxItem
                  key={limit}
                  textValue={limit.toString()}
                  endContent={
                    <Button
                      isIconOnly
                      className="p-2"
                      color="danger"
                      size="sm"
                      aria-label={`delete limit ${limit} from ${retransformed.name}`}
                      onPress={() =>
                        onChange(
                          "limits",
                          retransformed.limits.filter((l) => l !== limit),
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
      <div style={{ minHeight: "30vh" }}>
        <ScoreMetre target={retransformed} />
      </div>
    </div>
  );
}
