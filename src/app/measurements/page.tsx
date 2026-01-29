"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";

import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from "@heroui/table";

import { CheckboxGroup, Checkbox } from "@heroui/checkbox";

import { Button } from "@heroui/button";

import { Pagination } from "@heroui/pagination";
import { GlobalState } from "@/util/GlobalState";
import { Select, SelectItem } from "@heroui/select";
import { downloadFile } from "@/util/Util";
import { useContextSelector } from "use-context-selector";

enum ShowableValues {
  Factors = "factors",
  Targets = "targets",
  RetransformedTargets = "retransformed-targets",
}

async function exportMeasurements(
  globalState: Pick<
    GlobalState,
    "measurements" | "factors" | "showFactorNoiseInMeasurements" | "targets"
  >,
  shownValues: ShowableValues[],
) {
  if (globalState.measurements.length === 0) return "";

  const blacklist = ["key"];
  if (
    !shownValues.includes(ShowableValues.Factors) ||
    !globalState.showFactorNoiseInMeasurements
  ) {
    blacklist.push(
      ...globalState.factors.map((factor) => factor.formulaSymbol),
    );
  }
  if (
    !shownValues.includes(ShowableValues.Factors) ||
    globalState.showFactorNoiseInMeasurements
  ) {
    blacklist.push(
      ...globalState.factors.map((factor) => `${factor.formulaSymbol}_raw`),
    );
  }
  if (!shownValues.includes(ShowableValues.Targets))
    blacklist.push(
      ...globalState.targets.map((target) => target.formulaSymbol),
    );
  if (!shownValues.includes(ShowableValues.RetransformedTargets))
    blacklist.push(
      ...globalState.targets.map((target) => target.formulaSymbol),
    );

  const keys = Object.keys(globalState.measurements[0]).filter(
    (key) => !blacklist.includes(key),
  );
  const header = (
    globalState.showFactorNoiseInMeasurements
      ? keys
      : keys.map((key) => (key.endsWith("_raw") ? key.slice(0, -4) : key))
  ).join(",");
  const rows = globalState.measurements.map((measurement) =>
    keys.map((key) => JSON.stringify(measurement[key] || "")).join(","),
  );

  const fileContents = [header, ...rows].join("\n");
  downloadFile(
    new Blob([fileContents], { type: "text/csv" }),
    "text/csv",
    "measurements.csv",
    "CSV file",
  );
}

export default function Page() {
  const { globalState } = useContextSelector(
    GlobalStateContext,
    ({ globalState }) => ({
      globalState: {
        factors: globalState.factors,
        showFactorNoiseInMeasurements:
          globalState.showFactorNoiseInMeasurements,
        targets: globalState.targets,
        retransformedTargets: globalState.retransformedTargets,
        measurements: globalState.measurements,
      },
    }),
  );
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
          globalState.showFactorNoiseInMeasurements
            ? factor.formulaSymbol
            : `${factor.formulaSymbol}_raw`,
        )
      : []),
    ...(shownValues.includes(ShowableValues.Targets)
      ? globalState.targets.map((target) => target.formulaSymbol)
      : []),
    ...(shownValues.includes(ShowableValues.RetransformedTargets)
      ? globalState.retransformedTargets.map(
          (retransformedTarget) => retransformedTarget.formulaSymbol,
        )
      : []),
  ];

  const decimalsLookup: Map<string, number> = new Map(
    globalState.targets
      .map((t) => [t.formulaSymbol, t.numDecimalPlaces] as [string, number])
      .concat(
        globalState.retransformedTargets.map(
          (rt) => [rt.formulaSymbol, rt.numDecimalPlaces] as [string, number],
        ),
      ),
  );

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const pages = Math.ceil(globalState.measurements.length / rowsPerPage);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return globalState.measurements.slice(start, end);
  }, [page, rowsPerPage, globalState.measurements]);

  return (
    <div className={styles.container}>
      <Table
        aria-label="Table containing all measurements from the simulation"
        isStriped
        bottomContent={
          <div className="flex w-full justify-center">
            <Pagination
              isCompact
              showControls
              showShadow
              color="primary"
              page={page}
              total={pages}
              onChange={(page) => setPage(page)}
            />
          </div>
        }
        classNames={{
          wrapper: "min-h-[222px]",
        }}
      >
        <TableHeader>
          {columns.map((column) => (
            <TableColumn key={column}>
              {!globalState.showFactorNoiseInMeasurements &&
              column.endsWith("_raw")
                ? column.slice(0, -4)
                : column}
            </TableColumn>
          ))}
        </TableHeader>
        <TableBody items={paginatedItems}>
          {(item) => (
            <TableRow key={item.key}>
              {(columnKey) => (
                <TableCell>
                  <span>
                    {item[columnKey] !== undefined
                      ? Math.round(
                          (item[columnKey]! as number) *
                            Math.pow(
                              10,
                              decimalsLookup.get(columnKey as string) ?? 1,
                            ),
                        ) /
                        Math.pow(
                          10,
                          decimalsLookup.get(columnKey as string) ?? 1,
                        )
                      : "/"}
                  </span>
                </TableCell>
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

        <div className="flex items-center gap-4">
          <Select
            label="Rows displayed"
            onSelectionChange={(v) => {
              const val = Array.from(v as Set<string>)[0];
              setRowsPerPage(parseInt(val));
              setPage(1);
            }}
            selectedKeys={new Set([rowsPerPage.toString()])}
            className="w-50"
            size="sm"
          >
            {[10, 20, 30, 50].map((rows) => (
              <SelectItem key={rows.toString()}>{rows.toString()}</SelectItem>
            ))}
          </Select>
          <Button
            color="primary"
            onPress={() => exportMeasurements(globalState, shownValues)}
          >
            Export measurements
          </Button>
        </div>
      </div>
    </div>
  );
}
