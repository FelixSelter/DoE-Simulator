"use client";

import "./globals-compiled.css";
import NavBar from "@/components/NavBar";
import GlobalStateContextProvider, {
  GlobalStateContext,
} from "@/util/GlobalStateContextProvider";
import { useContext } from "react";
import { NextUIProvider } from "@nextui-org/react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { globalState } = useContext(GlobalStateContext);

  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>DOE-Simulator</title>
      </head>
      <body
        style={Object.fromEntries(
          Object.entries(globalState.colorTheme).map(([key, value]) => [
            `--${key}`,
            value,
          ])
        )}
      >
        <NextUIProvider>
          <GlobalStateContextProvider>
            <ToastContainer position="top-right" theme="colored" />
            <div
              style={{
                display: "grid",
                height: "100vh",
                gridTemplateRows: "min-content 1fr",
              }}
            >
              <NavBar />
              {children}
            </div>
          </GlobalStateContextProvider>
        </NextUIProvider>
      </body>
    </html>
  );
}
