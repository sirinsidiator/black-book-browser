use rust_ooz::{decompress, read_partial_file};
use std::fs::File;
use std::io::Write;
use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use tauri::http;
use work_queue::{LocalQueue, Queue};
use zune_inflate::DeflateDecoder;

fn inflate(buffer: Vec<u8>) -> Result<Vec<u8>, String> {
    let mut decoder = DeflateDecoder::new(buffer.as_slice());
    match decoder.decode_zlib() {
        Ok(result) => return Ok(result),
        Err(err) => return Err(format!("Error: {:?}", err)),
    }
}

fn save_file(path: &str, content: Vec<u8>) -> Result<Vec<u8>, String> {
    // try to create whole folder structure
    let parent = Path::new(path).parent();
    if parent.is_none() {
        return Err(format!(
            "Error: Failed to get parent directory of {:?}",
            path
        ));
    }
    let parent = parent.unwrap();
    if !parent.exists() {
        if std::fs::create_dir_all(parent).is_err() {
            return Err(format!("Error: Failed to create directory {:?}", parent));
        }
    }

    let file = File::create(path);
    if file.is_err() {
        return Err(format!("Error: Failed to create file {:?}", path));
    }
    let mut file = file.unwrap();
    if file.write_all(&content).is_err() {
        return Err(format!("Error: Failed to write file {:?}", path));
    }
    return Ok(vec![]);
}

fn extract_file(
    target_path: &str,
    archive_path: &str,
    offset: usize,
    compressed_size: usize,
    file_size: usize,
    compression_type: u8,
) -> Result<Vec<u8>, String> {
    let content;
    if compression_type == 0 {
        content = read_partial_file(archive_path, offset, compressed_size);
    } else {
        content = decompress(archive_path, offset, compressed_size, file_size);
    }

    if content.is_err() {
        return Err(content.unwrap_err());
    }

    return save_file(target_path, content.unwrap());
}

fn build_basic_response(length: usize) -> http::response::Builder {
    http::response::Builder::new()
        .header("Origin", "*")
        .header("Access-Control-Allow-Origin", "*")
        .header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        .header("Access-Control-Allow-Headers", "*")
        .header("Content-Length", length)
}

fn build_ok_response(result: Vec<u8>) -> Result<http::Response<Vec<u8>>, http::Error> {
    build_basic_response(result.len())
        .header("Content-Type", "application/octet-stream")
        .status(200)
        .body(result)
}

fn build_error_response(err: String) -> Result<http::Response<Vec<u8>>, http::Error> {
    build_basic_response(err.len())
        .header("Content-Type", "text/plain")
        .status(500)
        .body(err.into_bytes())
}

pub fn build_options_response() -> Result<http::Response<Vec<u8>>, http::Error> {
    build_basic_response(0).status(200).body(vec![])
}

fn get_params_from_request(req: http::Request<Vec<u8>>) -> Result<serde_json::Value, String> {
    let params = req.body().to_vec();
    let params = serde_json::from_slice(&params);
    if params.is_err() {
        return Err(format!(
            "Error: Failed to parse JSON: {:?}",
            params.unwrap_err()
        ));
    }

    return Ok(params.unwrap());
}

struct Task(Box<dyn Fn(&mut LocalQueue<Task>, &mut LocalExtractionProgress) + Send>);

pub struct ExtractionProgress {
    pub(crate) done: Arc<AtomicUsize>,
    pub(crate) errors: Arc<Mutex<Vec<String>>>,
    pub(crate) successes: Arc<AtomicUsize>,
    pub(crate) failures: Arc<AtomicUsize>,
}

impl ExtractionProgress {
    pub(crate) fn clone(&self) -> ExtractionProgress {
        ExtractionProgress {
            done: Arc::clone(&self.done),
            errors: Arc::clone(&self.errors),
            successes: Arc::clone(&self.successes),
            failures: Arc::clone(&self.failures),
        }
    }
}

struct LocalExtractionProgress {
    done: usize,
    successes: usize,
    failures: usize,
}

fn extract_files_parallel(files: &Vec<serde_json::Value>, progress: ExtractionProgress) {
    let threads = num_cpus::get();
    let queue: Queue<Task> = Queue::new(threads, 16);

    for file in files {
        let target_path = file["targetPath"].as_str().unwrap().to_owned();
        let archive_path = file["archivePath"].as_str().unwrap().to_owned();
        let offset = file["offset"].as_u64().unwrap() as usize;
        let compressed_size = file["compressedSize"].as_u64().unwrap() as usize;
        let file_size = file["fileSize"].as_u64().unwrap() as usize;
        let compression_type = file["compressionType"].as_u64().unwrap() as u8;
        let progress = progress.clone();

        queue.push(Task(Box::new(
            move |_local: &mut LocalQueue<Task>, local_progress: &mut LocalExtractionProgress| {
                match extract_file(
                    &target_path,
                    &archive_path,
                    offset,
                    compressed_size,
                    file_size,
                    compression_type,
                ) {
                    Ok(_) => {
                        local_progress.successes += 1;
                    }
                    Err(err) => {
                        local_progress.failures += 1;
                        progress
                            .errors
                            .lock()
                            .unwrap()
                            .push(format!("Failed to extract {:?}: {:?}", target_path, err));
                    }
                }
                local_progress.done += 1;
                if local_progress.done > 50 {
                    progress
                        .done
                        .fetch_add(local_progress.done, Ordering::Relaxed);
                    progress
                        .successes
                        .fetch_add(local_progress.successes, Ordering::Relaxed);
                    progress
                        .failures
                        .fetch_add(local_progress.failures, Ordering::Relaxed);
                    local_progress.done = 0;
                    local_progress.successes = 0;
                    local_progress.failures = 0;
                }
            },
        )));
    }

    let handles: Vec<_> = queue
        .local_queues()
        .map(move |mut local_queue| {
            let progress = progress.clone();
            std::thread::spawn(move || {
                let mut local_progress = LocalExtractionProgress {
                    done: 0,
                    successes: 0,
                    failures: 0,
                };
                while let Some(task) = local_queue.pop() {
                    task.0(&mut local_queue, &mut local_progress);
                }
                progress
                    .done
                    .fetch_add(local_progress.done, Ordering::SeqCst);
                progress
                    .successes
                    .fetch_add(local_progress.successes, Ordering::SeqCst);
                progress
                    .failures
                    .fetch_add(local_progress.failures, Ordering::SeqCst);
            })
        })
        .collect();

    for handle in handles {
        handle.join().unwrap();
    }
}

pub fn handle_ipc_message(
    req: http::Request<Vec<u8>>,
    extraction_progress: ExtractionProgress,
) -> Result<http::Response<Vec<u8>>, http::Error> {
    let result: Result<Vec<u8>, String>;

    let path = req.uri().path();
    if path == "/inflate" {
        let buffer = req.body();
        result = inflate(buffer.to_vec());
    } else if path == "/read-partial-file" {
        match get_params_from_request(req) {
            Ok(params) => {
                let path = params["path"].as_str().unwrap();
                let offset: usize = params["offset"].as_u64().unwrap() as usize;
                let length = params["length"].as_u64().unwrap() as usize;
                result = read_partial_file(path, offset, length);
            }
            Err(err) => {
                return build_error_response(err);
            }
        }
    } else if path == "/decompress" {
        match get_params_from_request(req) {
            Ok(params) => {
                let target_path = params["path"].as_str().unwrap();
                let offset = params["offset"].as_u64().unwrap() as usize;
                let compressed_size = params["compressedSize"].as_u64().unwrap() as usize;
                let file_size = params["fileSize"].as_u64().unwrap() as usize;
                result = decompress(target_path, offset, compressed_size, file_size);
            }
            Err(err) => {
                return build_error_response(err);
            }
        }
    } else if path == "/extract-files" {
        let progress = extraction_progress.clone();
        match get_params_from_request(req) {
            Ok(params) => {
                let files = params.as_array().unwrap();
                extract_files_parallel(files, extraction_progress);
                let successes = progress.successes.load(Ordering::SeqCst);
                let failures = progress.failures.load(Ordering::SeqCst);
                let mut errors = progress.errors.lock().unwrap();
                let response = serde_json::json!({
                    "success": successes,
                    "failed": failures,
                    "errors": errors.clone(),
                    "total": files.len(),
                });
                progress.done.store(0, Ordering::SeqCst);
                progress.successes.store(0, Ordering::SeqCst);
                progress.failures.store(0, Ordering::SeqCst);
                errors.clear();
                result = Ok(response.to_string().into_bytes());
            }
            Err(err) => {
                return build_error_response(err);
            }
        }
    } else if path == "/extract-files-progress" {
        let done = extraction_progress.done.load(Ordering::SeqCst);
        let errors = extraction_progress.errors.lock().unwrap();
        let response = serde_json::json!({
            "done": done,
            "errors": errors.clone(),
        });
        result = Ok(response.to_string().into_bytes());
    } else {
        return build_error_response(format!("Error: Unknown path {:?}", path));
    }

    match result {
        Ok(result) => return build_ok_response(result),
        Err(err) => return build_error_response(format!("Error: {:?}", err)),
    }
}
