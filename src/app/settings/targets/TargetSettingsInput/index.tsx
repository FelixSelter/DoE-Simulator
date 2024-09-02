"use client";

import { TargetSettings } from "@/util/GlobalState";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import React, { useContext, useState } from "react";
import styles from "./index.module.css";
import Heading from "@/components/Heading";
import { Input } from "@nextui-org/input";
import {
  Button,
  Listbox,
  ListboxItem,
  ListboxSection,
} from "@nextui-org/react";
import Plus from "@/util/icons/Plus";
import Trash from "@/util/icons/Trash";
import ScoreMetre from "@/components/ScoreMetre";

interface Props {
  target: TargetSettings;
}

export default function Index({ target }: Props) {
  const { setGlobalState } = useContext(GlobalStateContext);
  const [newLimit, setNewLimit] = useState(0);

  /**Onclick listener for target settings form.
   * Updates the global settings of a target.
   *
   * @param label The key of the target settings to be changed
   * @param value The new value of the setting
   */
  function onChange<K extends keyof TargetSettings>(
    label: K,
    value: TargetSettings[K]
  ) {
    setGlobalState((previousState) => {
      const updated = [...previousState.targets];
      const index = updated.findIndex((t) => t == target);

      console.assert(index !== -1);
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
    <div key={target.formulaSymbol}>
      <div className={styles.container}>
        <Heading title={target.formulaSymbol} />

        <Input
          type="text"
          label="Name target"
          onValueChange={(v) => onChange("name", v)}
          value={target.name}
        />
        <Input
          type="number"
          label="Number of decimal places"
          min={0}
          max={20}
          onValueChange={(v) => onChange("numDecimalPlaces", Number(v))}
          value={target.numDecimalPlaces.toString()}
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
                type="number"
                placeholder="type here"
                value={newLimit.toString()}
                onValueChange={(v) => setNewLimit(Number(v))}
              />
              <Button
                isIconOnly
                className="p-2"
                color="success"
                size="sm"
                onClick={() => {
                  if (!target.limits.includes(Number(newLimit)))
                    onChange("limits", [newLimit, ...target.limits]);
                }}
              >
                <Plus />
              </Button>
            </div>
          </div>

          <Listbox>
            <ListboxSection title="Limits">
              {target.limits.map((limit) => (
                <ListboxItem
                  key={limit}
                  endContent={
                    <Button
                      isIconOnly
                      className="p-2"
                      color="danger"
                      size="sm"
                      onClick={() =>
                        onChange(
                          "limits",
                          target.limits.filter((l) => l !== limit)
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
        <ScoreMetre target={target} />
      </div>
    </div>
  );
}
