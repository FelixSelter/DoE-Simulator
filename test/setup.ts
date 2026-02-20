import path from "path";
import os from "os";
import {
  type ChildProcessByStdio,
  exec,
  spawn,
  spawnSync,
} from "child_process";
import { Builder, Capabilities, WebDriver } from "selenium-webdriver";
import { fileURLToPath } from "url";
import { Stream } from "stream";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function killTauriApp(): Promise<void> {
  return new Promise((resolve, reject) => {
    // find all PIDs of "DoE+ Simulator"
    exec(`pgrep -f "DoE\\+ Simulator"`, (err, stdout, _) => {
      if (err) {
        if (err.code === 1) {
          return resolve();
        }
        return reject(err);
      }

      const pids = stdout
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((pid) => parseInt(pid, 10));

      console.log("Found Tauri PIDs:", pids);
      if (pids.length === 0) return resolve();

      for (const pid of pids) {
        try {
          process.kill(pid, "SIGTERM"); // graceful
        } catch (e) {
          console.error("Failed to kill PID", pid, e);
        }
      }

      resolve();
    });
  });
}

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const binaryName =
  process.platform === "win32" ? "DoE+ Simulator.exe" : "DoE+ Simulator";

export const application = path.join(
  projectRoot,
  "src-tauri",
  "target",
  "debug",
  binaryName,
);

export let driver: WebDriver;
export let tauriDriver: ChildProcessByStdio<Stream.Writable, null, null>;

export async function startDriver() {
  console.log("Starting tauri-driver...");
  spawnSync("cargo", ["tauri", "build", "--debug", "--no-bundle"], {
    cwd: projectRoot,
    stdio: "inherit",
  });

  tauriDriver = spawn(
    path.resolve(os.homedir(), ".cargo", "bin", "tauri-driver"),
    [],
    { stdio: [null, process.stdout, process.stderr] },
  );
  tauriDriver.on("error", (error) => {
    console.error("tauri-driver error:", error);
    process.exit(1);
  });
  tauriDriver.on("exit", (code) => {
    console.error("tauri-driver exited with code:", code);
  });

  await sleep(3000);

  const capabilities = new Capabilities();
  capabilities.set("tauri:options", { application });
  capabilities.setBrowserName("wry");

  driver = await new Builder()
    .withCapabilities(capabilities)
    .usingServer("http://127.0.0.1:4444/")
    .build();
}

export async function stopDriver() {
  console.log("Stopping tauri-driver...");
  if (driver) await driver.quit();
  if (tauriDriver) tauriDriver.kill();
  await sleep(1000);
  await killTauriApp();
}
