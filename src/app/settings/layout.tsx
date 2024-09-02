"use client";

import { GlobalStateContext } from "@/util/GlobalStateContextProvider";
import { redirect } from "next/navigation";
import { useContext, useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { globalState } = useContext(GlobalStateContext);

  useEffect(() => {
    if (!globalState.unlocked) {
      return redirect("/");
    }
  }, []);

  return <div>{children}</div>;
}
