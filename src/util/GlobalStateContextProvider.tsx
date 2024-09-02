"use client";

import React, { PropsWithChildren, useState } from "react";
import { GlobalState } from "./GlobalState";
import { darkTheme } from "./Theme";
import * as math from "mathjs";

export const defaultState: GlobalState = {
  colorTheme: darkTheme,
  factors: [],
  targets: [],
  transformEquation: math.evaluate(""),
  rawFactorInput: "",
  costPerReplication: 0,
  maxBudget: 0,
  showFactorNoiseInChart: false,
  trialCounter: 0,
  spendMoney: 0,
  retransformedTargets: [],
  retransformEquation: math.evaluate(""),
  rawRetransfromInput: "",
  measurements: [],
  replicationsPerTrial: 1,
  unlocked: false,
};

export const GlobalStateContext = React.createContext<{
  globalState: GlobalState;
  setGlobalState: React.Dispatch<React.SetStateAction<GlobalState>>;
}>({ globalState: defaultState, setGlobalState: () => null });

export default function GlobalStateContextProvider({
  children,
}: // eslint-disable-next-line @typescript-eslint/no-empty-object-type
PropsWithChildren<{}>) {
  const [globalState, setGlobalState] = useState(defaultState);

  return (
    <GlobalStateContext.Provider value={{ globalState, setGlobalState }}>
      {children}
    </GlobalStateContext.Provider>
  );
}
