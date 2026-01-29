"use client";

import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import { redirect } from "next/navigation";
import { useEffect } from "react";
import { useContextSelector } from "use-context-selector";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { globalState } = useContextSelector(
    GlobalStateContext,
    ({ globalState }) => ({
      globalState: {
        unlocked: globalState.unlocked,
      },
    }),
  );

  useEffect(() => {
    if (!globalState.unlocked) {
      return redirect("/");
    }
  }, []);

  return <div>{children}</div>;
}
