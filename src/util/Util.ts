import { isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { ErrorMsg, ErrorMsgKeys } from "./UserMsgSystem";
import { writeFile } from "@tauri-apps/plugin-fs";

export const numRegex = /^-?\d+(?:\.\d+)?$/;

function browserDownload(fileContents: Blob, fileName: string) {
  const url = URL.createObjectURL(fileContents);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function tauriDownload(
  fileName: string,
  fileContents: Blob,
): Promise<boolean> {
  const path = await save({
    filters: [
      {
        name: "Supported files",
        extensions: [fileName.split(".").slice(-1)[0]],
      },
    ],
    defaultPath: fileName,
  });
  if (!path) return false;
  try {
    const data = new Uint8Array(await fileContents.arrayBuffer());
    await writeFile(path, data);
  } catch (e) {
    ErrorMsg.setError(
      ErrorMsgKeys.ProjectSaveFailed,
      `Saving the file ${fileName} via tauri failed. It will be saved via browser default download: ${e}`,
    );
    return false;
  }
  return true;
}

async function filePickerDownload(
  fileName: string,
  mimeType: MIMEType,
  fileContents: Blob,
  description: string,
) {
  const handle = await window.showSaveFilePicker({
    suggestedName: fileName,
    types: [
      {
        description,
        accept: {
          [mimeType]: `.${fileName.split(".").slice(-1)[0]}`,
        },
      },
    ],
  });

  const writableStream = await handle.createWritable();
  await writableStream.write(fileContents);
  await writableStream.close();
}

export async function downloadFile(
  fileContents: Blob,
  mimeType: MIMEType,
  fileName: string,
  description: string,
) {
  console.assert(fileName.includes("."), "fileName must include an extension");
  if (isTauri()) {
    const success = await tauriDownload(fileName, fileContents);
    if (success) return;
  }
  // Not available in firefox and safari yet
  if ((window as { showSaveFilePicker: unknown }).showSaveFilePicker)
    await filePickerDownload(fileName, mimeType, fileContents, description);
  else browserDownload(fileContents, fileName);
}

export async function confirmHelper(message: string): Promise<boolean> {
  const result = window.confirm(message);

  // Check if result is Promise-like because tauri webview overrides window.confirm and makes it async
  if (typeof result === "object" && result !== null && "then" in result)
    return await result;

  // Normal browser boolean
  return result as boolean;
}
