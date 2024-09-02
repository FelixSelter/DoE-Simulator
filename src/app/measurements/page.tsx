"use client";

import React, { useContext, useState } from "react";
import styles from "./page.module.css";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";

import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from "@nextui-org/table";
import {
  Button,
  Checkbox,
  CheckboxGroup,
  getKeyValue,
} from "@nextui-org/react";
import { downloadBlob } from "@/util/Util";

enum ShowableValues {
  Factors = "factors",
  Targets = "targets",
  RetransformedTargets = "retransformed-targets",
}

export default function Page() {
  const { globalState } = useContext(GlobalStateContext);
  const [shownValues, setShownValues] = useState([
    ShowableValues.Factors,
    ShowableValues.Targets,
    ShowableValues.RetransformedTargets,
  ]);

  const columns = [
    "Trial",
    "Rep",
    ...(shownValues.includes(ShowableValues.Factors)
      ? globalState.factors.map((factor) =>
          globalState.showFactorNoiseInChart
            ? factor.formulaSymbol
            : `${factor.formulaSymbol}_raw`
        )
      : []),
    ...(shownValues.includes(ShowableValues.Targets)
      ? globalState.targets.map((target) => target.formulaSymbol)
      : []),
    ...(shownValues.includes(ShowableValues.RetransformedTargets)
      ? globalState.retransformedTargets.map(
          (retransformedTarget) => retransformedTarget.formulaSymbol
        )
      : []),
  ];

  function exportMeasurements() {
    if (globalState.measurements.length === 0) return "";

    const blacklist = ["key"];
    if (
      !shownValues.includes(ShowableValues.Factors) ||
      !globalState.showFactorNoiseInChart
    ) {
      blacklist.push(
        ...globalState.factors.map((factor) => factor.formulaSymbol)
      );
    }
    if (
      !shownValues.includes(ShowableValues.Factors) ||
      globalState.showFactorNoiseInChart
    ) {
      blacklist.push(
        ...globalState.factors.map((factor) => `${factor.formulaSymbol}_raw`)
      );
    }
    if (!shownValues.includes(ShowableValues.Targets))
      blacklist.push(
        ...globalState.targets.map((target) => target.formulaSymbol)
      );
    if (!shownValues.includes(ShowableValues.RetransformedTargets))
      blacklist.push(
        ...globalState.targets.map((target) => target.formulaSymbol)
      );

    const keys = Object.keys(globalState.measurements[0]).filter(
      (key) => !blacklist.includes(key)
    );
    const header = (
      globalState.showFactorNoiseInChart
        ? keys
        : keys.map((key) => (key.endsWith("_raw") ? key.slice(0, -4) : key))
    ).join(",");
    const rows = globalState.measurements.map((measurement) =>
      keys.map((key) => JSON.stringify(measurement[key] || "")).join(",")
    );

    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    downloadBlob(blob, "measurements.csv");
  }
  return (
    <div className={styles.container}>
      <Table isStriped>
        <TableHeader>
          {columns.map((column) => (
            <TableColumn key={column}>
              {!globalState.showFactorNoiseInChart && column.endsWith("_raw")
                ? column.slice(0, -4)
                : column}
            </TableColumn>
          ))}
        </TableHeader>
        <TableBody items={globalState.measurements}>
          {(item) => (
            <TableRow key={item.key}>
              {(columnKey) => (
                <TableCell>{getKeyValue(item, columnKey)}</TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className={styles.buttonBar}>
        <CheckboxGroup
          label="Values to show"
          orientation="horizontal"
          color="primary"
          value={shownValues}
          onChange={(v) => setShownValues(v as ShowableValues[])}
        >
          <Checkbox value={ShowableValues.Factors}>Factors</Checkbox>
          <Checkbox value={ShowableValues.Targets}>Targets</Checkbox>
          <Checkbox value={ShowableValues.RetransformedTargets}>
            Retransformed targets
          </Checkbox>
        </CheckboxGroup>
        <Button color="primary" onClick={exportMeasurements}>
          Export measurements
        </Button>
      </div>
    </div>
  );
}
