import "./globals.css";
import NavBar from "@/components/NavBar";
import GlobalStateContextProvider from "@/util/GlobalStateContextProvider";
import { HeroUIProvider as HeroUIProvider } from "@heroui/system";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>DOE-Simulator</title>
      </head>
      <body
        className="dark"
        style={
          {
            "--color1": "#2c2c2c",
            "--color2": "white",
            "--color3": "#1D1D1D",
            "--color4": "#454545",
          } as React.CSSProperties
        }
      >
        <HeroUIProvider>
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
        </HeroUIProvider>
      </body>
    </html>
  );
}
