// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::write;

#[tauri::command]
fn write_file(path: String, content: String) {
    let _ = write(
        if path.ends_with(".doe+") {
            path
        } else {
            format!("{}.doe+", path)
        },
        content,
    )
    .expect("Unable to write file");
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![write_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
