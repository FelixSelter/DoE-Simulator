import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import { downloadFile } from "@/util/Util";
import { Button } from "@heroui/button";
import { Canvg } from "canvg";
import { RefObject, useEffect, useRef } from "react";
import { Bar, BarChart, Label, XAxis, YAxis } from "recharts";
import { useContextSelector } from "use-context-selector";

export interface ChartProps {
  data: {
    factor: string;
    score: number;
  }[];
  title: string;
  children?: React.ReactNode;
}

// --- Text wrapping helper ---
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];

  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + " " + words[i];
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }

  lines.push(currentLine);
  return lines;
}

function createMetadataTableCanvas({
  width,
  description,
  date,
}: {
  width: number;
  description: string;
  date: string;
}): HTMLCanvasElement {
  const padding = 12;

  const fontSize = 14;
  const headerFontSize = 12;

  const lineHeight = fontSize * 1.45;

  const dateColumnWidth = 130;
  const descriptionWidth = width - dateColumnWidth - padding * 3;

  // Colors
  const borderColor = "#333";
  const dividerColor = "#bbb";
  const headerBg = "#f3f4f6";
  const textColor = "#111";
  const headerTextColor = "#444";

  const radius = 8;

  // --- Measure text ---
  const measureCanvas = document.createElement("canvas");

  const measureCtx = measureCanvas.getContext("2d");

  if (!measureCtx) throw new Error("No measure ctx");

  measureCtx.font = `${fontSize}px sans-serif`;

  const descLines = wrapText(measureCtx, description, descriptionWidth);

  const headerHeight = lineHeight * 1.4;

  const bodyHeight = descLines.length * lineHeight + padding;

  const tableHeight = headerHeight + bodyHeight + padding;

  // --- Canvas ---
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = tableHeight;

  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("No ctx");

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, tableHeight);

  const dividerX = width - dateColumnWidth;

  // --- HEADER BACKGROUND FIRST ---
  ctx.beginPath();

  ctx.moveTo(radius, 0);
  ctx.lineTo(width - radius, 0);
  ctx.quadraticCurveTo(width, 0, width, radius);

  ctx.lineTo(width, headerHeight);
  ctx.lineTo(0, headerHeight);

  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);

  ctx.closePath();

  ctx.fillStyle = headerBg;
  ctx.fill();

  // --- COLUMN DIVIDER ---
  ctx.beginPath();
  ctx.moveTo(dividerX, 0);
  ctx.lineTo(dividerX, tableHeight);

  ctx.lineWidth = 1;
  ctx.strokeStyle = dividerColor;
  ctx.stroke();

  // --- HEADER BOTTOM LINE ---
  ctx.beginPath();
  ctx.moveTo(0, headerHeight);
  ctx.lineTo(width, headerHeight);

  ctx.strokeStyle = dividerColor;
  ctx.stroke();

  // --- HEADER TEXT ---
  ctx.font = `bold ${headerFontSize}px sans-serif`;

  ctx.fillStyle = headerTextColor;

  ctx.textBaseline = "middle";

  ctx.textAlign = "left";

  ctx.fillText("Description", padding, headerHeight / 2);

  ctx.textAlign = "center";

  ctx.fillText("Date", dividerX + dateColumnWidth / 2, headerHeight / 2);

  // --- BODY TEXT ---
  ctx.font = `${fontSize}px sans-serif`;

  ctx.fillStyle = textColor;

  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const bodyStartY = headerHeight + padding / 2;

  descLines.forEach((line, i) => {
    ctx.fillText(line, padding, bodyStartY + i * lineHeight);
  });

  // Centered date
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const dateY = headerHeight + bodyHeight / 2;

  ctx.fillText(date, dividerX + dateColumnWidth / 2, dateY);

  // --- DRAW BORDER LAST (Fixes artifact) ---
  ctx.beginPath();

  ctx.moveTo(radius, 0);
  ctx.lineTo(width - radius, 0);
  ctx.quadraticCurveTo(width, 0, width, radius);

  ctx.lineTo(width, tableHeight);

  ctx.lineTo(0, tableHeight);

  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);

  ctx.closePath();

  ctx.lineWidth = 1.6;
  ctx.strokeStyle = borderColor;
  ctx.stroke();

  return canvas;
}

async function downloadChart(
  svgRef: React.RefObject<HTMLDivElement>,
  filename: string,
  description: string,
  date: string,
) {
  if (!svgRef.current) return;

  const svg = svgRef.current.querySelector("svg");
  if (!svg) return;

  const svgString = new XMLSerializer()
    .serializeToString(svg)
    .replaceAll("white", "black");

  // --- Render SVG ---
  const chartCanvas = document.createElement("canvas");
  chartCanvas.width = svg.clientWidth;
  chartCanvas.height = svg.clientHeight;

  const chartCtx = chartCanvas.getContext("2d");
  if (!chartCtx) return;

  const bgRect = `<rect width="100%" height="100%" fill="rgb(255,255,255)"/>`;

  const svgWithBg = svgString.replace(/(<svg[^>]*>)/, `$1${bgRect}`);

  const v = await Canvg.from(chartCtx, svgWithBg, {
    ignoreClear: true,
  });

  await v.render();

  // --- Build metadata table ---
  const tableCanvas = createMetadataTableCanvas({
    width: chartCanvas.width,
    description,
    date,
  });

  // --- Final canvas ---
  const finalCanvas = document.createElement("canvas");

  finalCanvas.width = chartCanvas.width;
  finalCanvas.height = chartCanvas.height + tableCanvas.height;

  const ctx = finalCanvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

  ctx.drawImage(chartCanvas, 0, 0);
  ctx.drawImage(tableCanvas, 0, chartCanvas.height);

  finalCanvas.toBlob((blob) => {
    if (!blob) return;
    downloadFile(blob, "image/png", filename, "Comparison chart");
  });
}

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

export default function Chart({ data, title, children }: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const globalState = useContextSelector(
    GlobalStateContext,
    ({ globalState }) => ({
      matrixFactors: globalState.matrixFactors,
      matrixProjectDescription: globalState.matrixProjectDescription,
      matrixDate: globalState.matrixDate,
    }),
  );

  // Make space for the axis labels
  useEffect(() => {
    const wrapper = chartRef.current?.querySelector(
      ".recharts-wrapper",
    ) as HTMLDivElement | null;
    if (!wrapper) return;
    const svg = wrapper.querySelector("svg");
    if (!svg) return;

    const svgWidth = svg.viewBox.baseVal.width;
    const svgHeight = (svg.viewBox.baseVal.height || svg.clientHeight) + 50;

    wrapper.style.maxHeight = `${svgHeight + 150}px`;
    svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
  }, [chartRef.current]);

  return (
    <div>
      <ChartContainer
        config={{
          score: {
            label: "Score",
          },
        }}
        className="min-h-50 w-full"
        ref={chartRef}
      >
        <BarChart accessibilityLayer data={data} title="ignored :(">
          <XAxis
            {...(globalState.matrixFactors.every((f) => f.length <= 5)
              ? {}
              : {
                  height: calculateXAxisHeight(globalState.matrixFactors),
                  angle: -90,
                  textAnchor: "end",
                })}
            dataKey="factor"
            tickLine={false}
            tickMargin={10}
            axisLine={true}
          >
            <Label position="bottom" offset={5} fontSize={16} fontWeight="bold">
              Factors
            </Label>
          </XAxis>
          <YAxis
            tickLine={true}
            tickMargin={10}
            axisLine={true}
            allowDecimals={false}
          >
            <Label
              position="left"
              angle={-90}
              offset={3}
              fontSize={16}
              fontWeight="bold"
            >
              Score
            </Label>
          </YAxis>
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="score" fill="#2563eb" radius={4} />
          <text
            x="50%"
            y="5%"
            textAnchor="middle"
            dominantBaseline="hanging"
            fontSize="20"
            fontWeight="600"
            fill="white"
            letterSpacing="0.5"
          >
            <tspan fontSize="30">{title}</tspan>
          </text>
        </BarChart>
      </ChartContainer>
      <div className="flex justify-end items-center gap-4">
        {children}
        <Button
          className="mt-4"
          color="primary"
          onPress={() =>
            downloadChart(
              chartRef as RefObject<HTMLDivElement>,
              "chart1.png",
              globalState.matrixProjectDescription,
              globalState.matrixDate,
            )
          }
        >
          Download {title}
        </Button>
      </div>
    </div>
  );
}
