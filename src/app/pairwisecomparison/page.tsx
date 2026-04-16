"use client";

import Plus from "@/util/icons/Plus";
import Trash from "@/util/icons/Trash";
import { ErrorMsg, ErrorMsgKeys, FailureMsg } from "@/util/UserMsgSystem";
import { confirmHelper, downloadFile } from "@/util/Util";
import { Button } from "@heroui/button";

import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { useEffect, useState } from "react";

import { z } from "zod";
import { useContextSelector } from "use-context-selector";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";

import "./style.css";
import { DateInput } from "@heroui/date-input";
import { parseDate } from "@internationalized/date";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("./Chart"), { ssr: false });

export const MatrixSchema = z.array(z.string().or(z.null()));

const ExportSchema = z
  .object({
    factors: z.array(z.string()),
    matrix: MatrixSchema,
    projectDescription: z.string(),
    date: z.string(),
  })
  .refine(
    (data) =>
      data.matrix.length ===
      (data.factors.length * data.factors.length - data.factors.length) / 2,
    {
      message: "Matrix size does not match number of factors",
    },
  )
  .refine(
    (data) => {
      const factorSet = new Set(data.factors);
      return data.matrix.every((v) => v === null || factorSet.has(v));
    },
    {
      message: "Matrix contains invalid factor references",
    },
  );
type ExportData = z.infer<typeof ExportSchema>;

export default function Page() {
  const [newFactor, setNewFactor] = useState<string>("");
  const [numBins, setNumBins] = useState(5);

  const { globalState, setGlobalState } = useContextSelector(
    GlobalStateContext,
    ({ globalState, setGlobalState }) => ({
      globalState: {
        matrix: globalState.matrix,
        matrixFactors: globalState.matrixFactors,
        matrixProjectDescription: globalState.matrixProjectDescription,
        matrixDate: globalState.matrixDate,
      },
      setGlobalState,
    }),
  );

  useEffect(() => {
    // Comparison necessary because of switching between tabs, to avoid resetting the matrix when not needed
    const matLen =
      (globalState.matrixFactors.length *
        (globalState.matrixFactors.length - 1)) /
      2;
    if (globalState.matrix.length === matLen) return;
    setGlobalState((prev) => ({
      ...prev,
      matrix: Array(matLen).fill(null),
    }));
  }, [globalState.matrixFactors]);

  function triIndex(i: number, j: number): number {
    // i > j is required
    return (i * (i - 1)) / 2 + j;
  }

  function setCell(row: string, col: string, value: string | null) {
    const i = globalState.matrixFactors.indexOf(row);
    const j = globalState.matrixFactors.indexOf(col);

    if (i === -1 || j === -1) return;
    if (i === j) return;

    const rowIdx = Math.max(i, j);
    const colIdx = Math.min(i, j);

    const idx = triIndex(rowIdx, colIdx);

    setGlobalState((prev) => {
      const next = [...prev.matrix];
      next[idx] = value;
      return { ...prev, matrix: next };
    });
  }

  function getCell(row: string, col: string): string | null {
    const i = globalState.matrixFactors.indexOf(row);
    const j = globalState.matrixFactors.indexOf(col);

    if (i === -1 || j === -1) return null;
    if (i === j) return null;

    // ensure i > j (lower triangle)
    const rowIdx = Math.max(i, j);
    const colIdx = Math.min(i, j);

    const idx = triIndex(rowIdx, colIdx);
    return globalState.matrix[idx] ?? null;
  }

  const chartData1 = globalState.matrixFactors
    .map((factor) => {
      return {
        factor,
        // +1 to ensure that factors that are not selected at all still get a score and show up in the chart
        score: globalState.matrix.filter((v) => v === factor).length + 1,
      };
    })
    .sort((a, b) => b.score - a.score);

  const maxScore = Math.max(...chartData1.map((d) => d.score), 1);
  const chartData2 = chartData1.map((d) => {
    const normalized = d.score / maxScore; // 0..1
    const bin = Math.ceil(normalized * numBins); // 1..numBins

    return {
      factor: d.factor,
      score: Math.min(Math.max(bin, 1), numBins),
    };
  });

  return (
    <div className="p-6 sm:p-10">
      <h2 className="mb-6 text-xl font-semibold text-foreground">
        Projektinformation
      </h2>
      <div className="mb-4 gap-4 flex flex-col">
        <DateInput
          className="max-w-sm"
          label="Date of comparison"
          value={parseDate(globalState.matrixDate)}
          onChange={(value) => {
            setGlobalState((prev) => ({
              ...prev,
              matrixDate: value?.toString() ?? "2000-01-01",
            }));
          }}
        />
        <Textarea
          minRows={10}
          label="Project description"
          placeholder="Enter your description"
          value={globalState.matrixProjectDescription}
          onChange={(e) =>
            setGlobalState((prev) => ({
              ...prev,
              matrixProjectDescription: e.target.value,
            }))
          }
        />
      </div>

      <h2 className="mb-6 text-xl font-semibold text-foreground">
        Add factors to compare
      </h2>

      <div className="mb-8 flex gap-2">
        <Input
          lang="en"
          type="text"
          aria-label="input for the new factor"
          placeholder="New factor"
          value={newFactor}
          onChange={(e) => setNewFactor(e.target.value)}
          classNames={{
            inputWrapper:
              "bg-content1 border border-divider rounded-xl shadow-sm",
          }}
        />
        <Button
          aria-label="add new factor"
          isIconOnly
          color="success"
          size="sm"
          className="p-2"
          onPress={() => {
            if (newFactor.trim() === "") return;
            setGlobalState((prev) => ({
              ...prev,
              matrixFactors: prev.matrixFactors.includes(newFactor)
                ? prev.matrixFactors
                : [...prev.matrixFactors, newFactor],
            }));
            setNewFactor("");
          }}
        >
          <Plus />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {globalState.matrixFactors.map((factor) => (
          <div
            key={factor}
            className="flex items-center justify-between rounded-2xl border border-divider bg-content1 p-4 shadow-sm transition hover:shadow-md gap-2"
          >
            <span className="truncate text-sm font-medium text-foreground">
              {factor}
            </span>
            <Button
              aria-label={`delete factor ${factor}`}
              isIconOnly
              color="danger"
              size="sm"
              className="p-2"
              onPress={() => {
                setGlobalState((prev) => ({
                  ...prev,
                  matrixFactors: prev.matrixFactors.filter((f) => f !== factor),
                }));
              }}
            >
              <Trash />
            </Button>
          </div>
        ))}
      </div>

      <h2 className="mb-6 text-xl font-semibold text-foreground mt-12">
        Comparison Matrix
      </h2>
      <div
        className="overflow-x-scroll"
        style={{
          maxWidth: "calc(100vw - 4 * var(--spacing) * 6)",
        }}
      >
        <Table removeWrapper aria-label="Example static collection table">
          <TableHeader>
            {[
              "",
              ...globalState.matrixFactors.slice(
                0,
                globalState.matrixFactors.length - 1,
              ),
            ].map((col) => (
              <TableColumn className="text-center" key={col}>
                {col}
              </TableColumn>
            ))}
          </TableHeader>
          <TableBody>
            {globalState.matrixFactors.slice(1).map((row, rowIdx) => {
              return (
                <TableRow key={row}>
                  {(col) => {
                    if (col === "")
                      return (
                        <TableCell className="bg-default-100 font-medium text-center">
                          {row}
                        </TableCell>
                      );
                    if (
                      globalState.matrixFactors.indexOf(col as string) > rowIdx
                    )
                      return (
                        <TableCell>
                          <></>
                        </TableCell>
                      );
                    return (
                      <TableCell>
                        <Select
                          isInvalid={getCell(row, col as string) === null}
                          className="max-w-xs"
                          label="Choose"
                          selectedKeys={(() => {
                            const val = getCell(row, col as string);
                            if (val === null) return new Set<string>();
                            return new Set(
                              [val].filter((v) =>
                                globalState.matrixFactors.includes(v),
                              ),
                            );
                          })()}
                          variant="bordered"
                          onSelectionChange={(v) => {
                            setCell(
                              row,
                              col as string,
                              Array.from(v)[0] as string,
                            );
                          }}
                        >
                          <SelectItem key={col}>{col}</SelectItem>
                          <SelectItem key={row}>{row}</SelectItem>
                        </Select>
                      </TableCell>
                    );
                  }}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-end gap-2">
        <input
          type="file"
          style={{ display: "none" }}
          id="file-picker-compmat"
          accept=".compmat"
          onChange={async (e) => {
            if (!e.target.files || e.target.files.length === 0) return;
            const file = e.target.files[0];
            // Reset files otherwise the same file cannot be loaded twice in a row because the onChange event is not triggered
            e.target.value = null!;
            const ok = await confirmHelper(
              "Loading a pairwise comparison will overwrite your current matrix, date and description but keep the rest of the project as is. Make sure to save first if you want to keep it.",
            );
            if (!ok) return;

            if (file) {
              const reader = new FileReader();
              reader.readAsText(file, "UTF-8");
              reader.onload = function (evt) {
                try {
                  const importData = ExportSchema.parse(
                    JSON.parse(evt.target!.result as string),
                  );
                  setGlobalState((prev) => {
                    return {
                      ...prev,
                      matrixFactors: importData.factors,
                      matrix: importData.matrix,
                      matrixProjectDescription: importData.projectDescription,
                      matrixDate: importData.date,
                    };
                  });
                } catch (error) {
                  new FailureMsg(
                    `Your safe file is not a doe+ comparison matrix or might have been corrupted. Was it created by an old version of doe+ simulator? Info: ${error}`,
                  );
                }
              };

              reader.onerror = function () {
                new FailureMsg(
                  "There was a filesystem error loading the file. Please try again",
                );
              };
            }
          }}
        />
        <Button
          color="primary"
          onPress={async () => {
            try {
              const data: ExportData = {
                factors: globalState.matrixFactors,
                matrix: globalState.matrix,
                projectDescription: globalState.matrixProjectDescription,
                date: globalState.matrixDate,
              };
              const exportData = ExportSchema.parse(data);
              await downloadFile(
                new Blob([JSON.stringify(exportData)], {
                  type: "application/json",
                }),
                "application/json",
                "matrix.compmat",
                "Comparison Matrix",
              );
            } catch (err) {
              if (err instanceof z.ZodError)
                ErrorMsg.setError(
                  ErrorMsgKeys.MatrixExportFailed,
                  `Programming error. The data to export does not match the required schema: ${err.message}`,
                );
              else
                ErrorMsg.setError(
                  ErrorMsgKeys.MatrixExportFailed,
                  `Unexpected error during export: ${String(err)}`,
                );
            }
          }}
        >
          Export
        </Button>

        <Button
          color="primary"
          onPress={() => {
            document.getElementById("file-picker-compmat")!.click();
          }}
        >
          Import
        </Button>
      </div>
      <h2 className="mb-6 text-xl font-semibold text-foreground mt-12">
        Charts
      </h2>

      <Chart data={chartData1} title="Total Score" yAxisLabel="Total Score" />
      <Chart data={chartData2} title="Average Score" yAxisLabel="Average Score">
        <Input
          lang="en"
          type="number"
          label="Number of bins"
          min={1}
          step={1}
          value={numBins.toString()}
          onChange={(e) => setNumBins(parseInt(e.target.value) || 1)}
          className="max-w-50"
        />
      </Chart>
    </div>
  );
}
