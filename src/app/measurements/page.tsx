"use client";

import { useRef, useState, useCallback, useLayoutEffect } from "react";
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

const INFINITE_SCROLL_NUM_VISIBLE_ROWS_FROM_INDEX = 60;
const INFINITE_SCROLL_MAX_OFFSET_FROM_INDEX = 20;

function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number,
): T {
  let lastCall = 0;
  return function (...args: unknown[]) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      func(...args);
    }
  } as T;
}

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

function calculateFirstAndLastLoadedRow(
  globalState: Pick<GlobalState, "measurements">,
  scrollIndex: number,
) {
  const firstLoadedRow = Math.max(
    0,
    scrollIndex - INFINITE_SCROLL_MAX_OFFSET_FROM_INDEX,
  );
  const lastLoadedRow =
    Math.min(
      globalState.measurements.length,
      scrollIndex + INFINITE_SCROLL_NUM_VISIBLE_ROWS_FROM_INDEX,
    ) - 1;

  return { firstLoadedRow, lastLoadedRow };
}

function autoRestoreScrollPosition(
  container: HTMLElement,
  anchorIndex: number,
) {
  const anchorEl = container.querySelector(
    `tr[data-index="${anchorIndex}"]`,
  ) as HTMLElement | null;
  if (!anchorEl) {
    console.error(
      "Could not find anchor element for infinite scroll. This may cause a jump in scroll position.",
    );
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const anchorRect = anchorEl.getBoundingClientRect();
  const anchorOffset = anchorRect.top - containerRect.top;

  // Use a MutationObserver to detect DOM changes and move the scroll position up by the size of the unloaded rows
  const observer = new MutationObserver(() => {
    const newAnchorEl = container.querySelector(
      `tr[data-index="${anchorIndex}"]`,
    ) as HTMLElement | null;
    if (!newAnchorEl) {
      console.error(
        "Could not find anchor element for infinite scroll. This may cause a jump in scroll position.",
      );
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const newAnchorRect = newAnchorEl.getBoundingClientRect();
    const newOffset = newAnchorRect.top - containerRect.top;

    container.scrollTop += newOffset - anchorOffset;
    observer.disconnect();
  });
  observer.observe(container, { childList: true, subtree: true });
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

  const tableRef = useRef<HTMLTableElement>(null);

  const columns = [
    "Run",
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
      ? globalState.retransformedTargets.map((rt) => rt.formulaSymbol)
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

  const [scrollIndex, setScrollIndex] = useState(0);

  // Infinite scroll handler
  const throttledHandleScroll = useCallback(
    throttle(() => {
      const container = tableRef.current?.parentElement;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;

      const { firstLoadedRow, lastLoadedRow } = calculateFirstAndLastLoadedRow(
        globalState,
        scrollIndex,
      );
      const numLoadedRows = lastLoadedRow - firstLoadedRow + 1;

      const rowHeight =
        scrollHeight / Math.min(numLoadedRows, globalState.measurements.length);

      const numVisibleRows = Math.ceil(container.clientHeight / rowHeight);

      const firstVisibleRow =
        firstLoadedRow + Math.floor(scrollTop / rowHeight); // The row that is visible at the top of the container inferred from the scroll position
      const lastVisibleRow = firstVisibleRow + numVisibleRows; // The row that is visible at the bottom of the container inferred from the scroll position

      const anchorIndex = Math.round(firstVisibleRow + numVisibleRows / 2);
      // Add more rows at the end
      if (
        lastLoadedRow - lastVisibleRow <
        INFINITE_SCROLL_MAX_OFFSET_FROM_INDEX
      ) {
        setScrollIndex((scrollIndex) => {
          const newIndex = Math.min(
            scrollIndex + INFINITE_SCROLL_MAX_OFFSET_FROM_INDEX,
            globalState.measurements.length -
              INFINITE_SCROLL_MAX_OFFSET_FROM_INDEX,
          );

          if (scrollIndex !== newIndex)
            autoRestoreScrollPosition(container, anchorIndex);
          return newIndex;
        });

        // Add more rows at the beginning
      } else if (
        firstVisibleRow - firstLoadedRow <
        INFINITE_SCROLL_MAX_OFFSET_FROM_INDEX - 2 // Keep a small offset to avoid constantly loading then unloading again
      ) {
        setScrollIndex((scrollIndex) => {
          const newIndex = Math.max(
            scrollIndex - INFINITE_SCROLL_MAX_OFFSET_FROM_INDEX,
            INFINITE_SCROLL_MAX_OFFSET_FROM_INDEX,
          );

          if (scrollIndex !== newIndex)
            autoRestoreScrollPosition(container, anchorIndex);
          return newIndex;
        });
      }
    }, 100),
    [globalState.measurements.length, scrollIndex],
  );

  useLayoutEffect(() => {
    if (rowsPerPage !== globalState.measurements.length) return;
    const container = tableRef.current?.parentElement;
    if (!container) return;

    container.addEventListener("scroll", throttledHandleScroll);
    return () => container.removeEventListener("scroll", throttledHandleScroll);
  }, [throttledHandleScroll, rowsPerPage, globalState.measurements.length]);

  const itemsToRender =
    rowsPerPage === globalState.measurements.length
      ? globalState.measurements
          .map((item, i) => ({ item, i }))
          .slice(
            Math.max(0, scrollIndex - INFINITE_SCROLL_MAX_OFFSET_FROM_INDEX),
            Math.min(
              globalState.measurements.length,
              scrollIndex + INFINITE_SCROLL_NUM_VISIBLE_ROWS_FROM_INDEX,
            ),
          )
      : globalState.measurements
          .map((item, i) => ({ item, i }))
          .slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <div className={styles.container}>
      <Table
        ref={tableRef}
        isHeaderSticky
        aria-label="Table containing all measurements from the simulation"
        isStriped
        bottomContent={
          rowsPerPage !== globalState.measurements.length && (
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
          )
        }
        classNames={{
          wrapper: "min-h-[222px]",
          base: "max-h-[80vh] overflow-auto w-full",
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
        <TableBody items={itemsToRender}>
          {({ item, i }) => (
            <TableRow key={item.key} data-index={i}>
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
            Retransformed Targets
          </Checkbox>
        </CheckboxGroup>

        <div className="flex items-center gap-4">
          <Button
            color="secondary"
            onPress={() =>
              tableRef.current?.scrollIntoView({ behavior: "smooth" })
            }
          >
            To the first row
          </Button>
          <Button
            color="secondary"
            onPress={() =>
              tableRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "end",
              })
            }
          >
            To the last row
          </Button>
          <Select
            label="Rows displayed"
            onSelectionChange={(v) => {
              const val = Array.from(v as Set<string>)[0];
              setRowsPerPage(parseInt(val));
              setPage(1);
              setScrollIndex(0);
            }}
            selectedKeys={new Set([rowsPerPage.toString()])}
            className="w-50"
            size="sm"
          >
            {[10, 20, 30, 50, globalState.measurements.length].map((rows) => (
              <SelectItem key={rows.toString()}>
                {rows === globalState.measurements.length
                  ? "All"
                  : rows.toString()}
              </SelectItem>
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
