"use client";

import React, { PropsWithChildren, useEffect, useRef, useState } from "react";
import { GlobalState } from "./GlobalState";
import * as math from "mathjs";
import { validateRetransformFormula } from "@/app/settings/retransformedtargets/page";
import { createContext } from "use-context-selector";

export const defaultState: GlobalState = {
  factors: [],
  targets: [],
  transformEquation: math.evaluate(""),
  rawFactorInput: "",
  costPerRun: 0,
  maxBudget: 0,
  showFactorNoiseInMeasurements: false,
  trialCounter: 0,
  spendMoney: 0,
  retransformedTargets: [],
  retransformEquation: math.evaluate(""),
  rawRetransformInput: "",
  measurements: [],
  replicationsPerTrial: 1,
  unlocked: false,
  delay: 0,
  simulationFactorValues: { current: new Map<string, number>() },
  livePreview: false,
  updatedFactors: 0,
  runCounter: 1,
  matrix: [],
  matrixFactors: [],
  matrixProjectDescription: "",
  matrixDate: "2000-01-01",
};

export const GlobalStateContext = createContext<{
  globalState: GlobalState;
  setGlobalState: React.Dispatch<React.SetStateAction<GlobalState>>;
}>({ globalState: defaultState, setGlobalState: () => null });

export default function GlobalStateContextProvider({
  children,
}: // eslint-disable-next-line @typescript-eslint/no-empty-object-type
PropsWithChildren<{}>) {
  const [globalState, setGlobalState] = useState(defaultState);
  const simulationFactorValues = useRef(new Map<string, number>());

  useEffect(() => {
    validateRetransformFormula(globalState.rawRetransformInput, globalState);
  }, [
    globalState.rawRetransformInput,
    globalState.factors,
    globalState.targets,
  ]);

  return (
    <GlobalStateContext.Provider
      value={{
        globalState: {
          ...globalState,
          simulationFactorValues,
        },
        setGlobalState,
      }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
}
