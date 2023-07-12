// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
async fn decompress(
    path: String,
    offset: usize,
    compressed_size: usize,
    file_size: usize,
) -> Result<Vec<u8>, String> {
    let mut output = vec![0; file_size];
    let input = fs::read(path).unwrap()[offset..offset + compressed_size].to_vec();

    unsafe {
        match oozle::decompress(&input, &mut output) {
            Ok(result_size) => {
                assert_eq!(result_size, file_size);
                Ok(output)
            }
            Err(err) => {
                let err = format!("Error: {:?}", err);
                Err(err)
            }
        }
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![decompress])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
