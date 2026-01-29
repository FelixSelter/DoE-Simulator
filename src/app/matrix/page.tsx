"use client";

import Plus from "@/util/icons/Plus";
import Trash from "@/util/icons/Trash";
import { ErrorMsg, ErrorMsgKeys, FailureMsg } from "@/util/UserMsgSystem";
import { downloadFile } from "@/util/Util";
import { Button } from "@heroui/button";

import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { RefObject, useEffect, useRef, useState } from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { Canvg } from "canvg";

import { z } from "zod";

const MatrixSchema = z.array(z.string().or(z.null()));

type Matrix = z.infer<typeof MatrixSchema>;

const ExportSchema = z
  .object({
    factors: z.array(z.string()),
    matrix: MatrixSchema,
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

function calculateXAxisHeight(
  labels: string[],
  font = "12px sans-serif",
  padding = 10,
) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  ctx.font = font;

  const maxWidth = Math.max(
    ...labels.map((label) => ctx.measureText(label).width),
  );

  return Math.ceil(maxWidth + padding);
}

export default function Page() {
  const [factors, setFactors] = useState<string[]>([]);
  const [newFactor, setNewFactor] = useState<string>("");

  const [matrix, setMatrix] = useState<Matrix>([]);
  const [numBins, setNumBins] = useState(5);

  useEffect(() => {
    setMatrix(Array((factors.length * (factors.length - 1)) / 2).fill(null));
  }, [factors]);

  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = true;
    }

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  function triIndex(i: number, j: number): number {
    // i > j is required
    return (i * (i - 1)) / 2 + j;
  }

  function setCell(row: string, col: string, value: string | null) {
    const i = factors.indexOf(row);
    const j = factors.indexOf(col);

    if (i === -1 || j === -1) return;
    if (i === j) return;

    const rowIdx = Math.max(i, j);
    const colIdx = Math.min(i, j);

    const idx = triIndex(rowIdx, colIdx);

    setMatrix((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }

  function getCell(row: string, col: string): string | null {
    const i = factors.indexOf(row);
    const j = factors.indexOf(col);

    if (i === -1 || j === -1) return null;
    if (i === j) return null;

    // ensure i > j (lower triangle)
    const rowIdx = Math.max(i, j);
    const colIdx = Math.min(i, j);

    const idx = triIndex(rowIdx, colIdx);
    return matrix[idx] ?? null;
  }

  const chartData1 = factors
    .map((factor) => {
      return { factor, score: matrix.filter((v) => v === factor).length };
    })
    .sort((a, b) => b.score - a.score);

  const maxScore = Math.max(...chartData1.map((d) => d.score), 1);
  const chartData2 = chartData1.map((d) => {
    return {
      factor: d.factor,
      score: Math.round((d.score / maxScore) * numBins),
    };
  });

  const chart1Ref = useRef<HTMLDivElement>(null);
  const chart2Ref = useRef<HTMLDivElement>(null);

  async function downloadChart(
    svgRef: React.RefObject<HTMLDivElement>,
    filename: string,
  ) {
    if (!svgRef.current) return;

    const svg = svgRef.current.querySelector("svg");
    ErrorMsg.setError(
      ErrorMsgKeys.SVGExportFailed,
      "Could not find SVG element in chart container for export.",
      !svg,
    );
    if (!svg) return;

    const svgString = new XMLSerializer().serializeToString(svg);

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.width = svg.clientWidth;
    canvas.height = svg.clientHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background color
    const bgRect = `<rect width="100%" height="100%" fill="rgb(9,9,11)"/>`;
    const svgWithBg = svgString.replace(/(<svg[^>]*>)/, `$1${bgRect}`);

    // Render SVG to canvas
    const v = await Canvg.from(ctx, svgWithBg, { ignoreClear: true });
    await v.render();

    // Convert to blob and download
    canvas.toBlob((blob) => {
      downloadFile(blob!, "image/png", filename, "Comparison chart");
    });
  }

  return (
    <div className="p-6 sm:p-10">
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
            setFactors(
              factors.includes(newFactor) ? factors : [...factors, newFactor],
            );
            setNewFactor("");
          }}
        >
          <Plus />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {factors.map((factor) => (
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
                setFactors((factors) => factors.filter((f) => f !== factor));
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
            {["", ...factors.slice(0, factors.length - 1)].map((col) => (
              <TableColumn className="text-center" key={col}>
                {col}
              </TableColumn>
            ))}
          </TableHeader>
          <TableBody>
            {factors.slice(1).map((row, rowIdx) => {
              return (
                <TableRow key={row}>
                  {(col) => {
                    if (col === "")
                      return (
                        <TableCell className="bg-default-100 font-medium text-center">
                          {row}
                        </TableCell>
                      );
                    if (factors.indexOf(col as string) > rowIdx)
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
                              [val].filter((v) => factors.includes(v)),
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
          onChange={(e) => {
            const file = e.target.files![0];
            if (file) {
              const reader = new FileReader();
              reader.readAsText(file, "UTF-8");
              reader.onload = function (evt) {
                try {
                  const importData = ExportSchema.parse(
                    JSON.parse(evt.target!.result as string),
                  );
                  setFactors(importData.factors);
                  //Must be after setFactors to not overwrite
                  setTimeout(() => setMatrix(importData.matrix), 100);
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
                factors,
                matrix,
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
      <ChartContainer
        config={{
          score: {
            label: "Score",
          },
        }}
        className="min-h-50 w-full"
        ref={chart1Ref}
      >
        <BarChart accessibilityLayer data={chartData1}>
          <XAxis
            {...(factors.every((f) => f.length <= 5)
              ? {}
              : {
                  height: calculateXAxisHeight(factors),
                  angle: -90,
                  textAnchor: "end",
                })}
            dataKey="factor"
            tickLine={false}
            tickMargin={10}
            axisLine={true}
          />
          <YAxis
            tickLine={true}
            tickMargin={10}
            axisLine={true}
            allowDecimals={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="score" fill="#2563eb" radius={4} />
        </BarChart>
      </ChartContainer>
      <div className="flex justify-end">
        <Button
          className="mt-4"
          color="primary"
          onPress={() =>
            downloadChart(chart1Ref as RefObject<HTMLDivElement>, "chart1.png")
          }
        >
          Download Chart 1
        </Button>
      </div>
      <ChartContainer
        config={{
          score: {
            label: "Score",
          },
        }}
        className="min-h-50 w-full"
        ref={chart2Ref}
      >
        <BarChart accessibilityLayer data={chartData2}>
          <XAxis
            {...(factors.every((f) => f.length <= 5)
              ? {}
              : {
                  height: calculateXAxisHeight(factors),
                  angle: -90,
                  textAnchor: "end",
                })}
            dataKey="factor"
            tickLine={false}
            tickMargin={10}
            axisLine={true}
          />
          <YAxis
            tickLine={true}
            tickMargin={10}
            axisLine={true}
            allowDecimals={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="score" fill="#2563eb" radius={4} />
        </BarChart>
      </ChartContainer>
      <div className="flex justify-end items-center gap-4">
        <Input
          lang="en"
          type="number"
          label="Number of bins"
          min={1}
          step={1}
          value={numBins.toString()}
          onChange={(e) => setNumBins(parseInt(e.target.value) || 1)}
          className="max-w-50"
        ></Input>
        <Button
          color="primary"
          onPress={() =>
            downloadChart(chart2Ref as RefObject<HTMLDivElement>, "chart2.png")
          }
        >
          Download Chart 2
        </Button>
      </div>
    </div>
  );
}
