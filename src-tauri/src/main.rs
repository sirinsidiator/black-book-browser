// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[path = "bbb.rs"]
mod bbb;

#[tauri::command]
fn find_mnf_files_in_dir(path: &str) -> Vec<String> {
    let mut mnf_files = vec![];
    scan_for_mnf_files_recursivly(path, &mut mnf_files, 0);
    return mnf_files;
}

fn scan_for_mnf_files_recursivly(path: &str, mnf_files: &mut Vec<String>, level: u32) {
    if level > 4 {
        return;
    }

    for entry in std::fs::read_dir(path).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();
        if path.is_file() {
            let path = path.to_str().unwrap();
            if path.ends_with(".mnf") {
                mnf_files.push(path.to_string());
            }
        } else if path.is_dir() {
            scan_for_mnf_files_recursivly(path.to_str().unwrap(), mnf_files, level + 1);
        }
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![find_mnf_files_in_dir])
        .register_asynchronous_uri_scheme_protocol("bbb", |_app, req, res| {
            if req.method() == "OPTIONS" {
                match bbb::build_options_response() {
                    Ok(result) => res.respond(result),
                    Err(err) => {
                        eprintln!("Error: {:?}", err);
                    }
                }
            } else {
                tauri::async_runtime::spawn(async move {
                    match bbb::handle_ipc_message(req) {
                        Ok(result) => res.respond(result),
                        Err(err) => {
                            eprintln!("Error: {:?}", err);
                        }
                    }
                });
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
