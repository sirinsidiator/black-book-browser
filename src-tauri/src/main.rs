// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::error::Error;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::Path;
use tauri::http::ResponseBuilder;
use zune_inflate::DeflateDecoder;

#[cxx::bridge]
mod ffi {
    unsafe extern "C++" {
        include!("black-book-browser/include/ooz.h");

        unsafe fn Kraken_Decompress(
            src: *const u8,
            src_len: usize,
            dst: *mut u8,
            dst_len: usize,
        ) -> i32;
    }
}

fn read_partial_file(path: &str, offset: usize, length: usize) -> Result<Vec<u8>, String> {
    match File::open(path) {
        Ok(mut file) => {
            let mut output = vec![0; length];
            if file.seek(SeekFrom::Start(offset as u64)).is_err() {
                return Err(format!("Unable to seek to offset {}", offset));
            }
            if file.read_exact(&mut output).is_err() {
                return Err(format!("Unable to read {} bytes", length));
            }
            return Ok(output);
        }
        Err(err) => {
            let err = format!("{:?}", err);
            return Err(err);
        }
    }
}

fn decompress(
    path: &str,
    offset: usize,
    compressed_size: usize,
    file_size: usize,
) -> Result<Vec<u8>, String> {
    let input = read_partial_file(path, offset, compressed_size);
    if input.is_err() {
        return Err(input.unwrap_err());
    }
    let input = input.unwrap();

    unsafe {
        // ooz tends to write outside of the buffer, so we need to allocate a bit more
        let mut output = vec![0; file_size + 64];
        let result_size = ffi::Kraken_Decompress(
            input.as_ptr(),
            compressed_size,
            output.as_mut_ptr(),
            file_size,
        );
        if result_size < 0 {
            return Err(format!(
                "Error: Failed to decompress (result size: {})",
                result_size
            ));
        } else if result_size as usize != file_size {
            return Err(format!(
                "Error: Decompressed size mismatch (expected: {}, actual: {})",
                file_size, result_size
            ));
        }
        output.truncate(file_size);

        if output.len() > 16 && output[0..4] == [0, 0, 0, 0] {
            // output has some strange header which we skip for now (seen in game.mnf related archives)
            let mut offset = 4;
            offset += 4 + u32::from_be_bytes([
                output[offset],
                output[offset + 1],
                output[offset + 2],
                output[offset + 3],
            ]) as usize;
            offset += 4 + u32::from_be_bytes([
                output[offset],
                output[offset + 1],
                output[offset + 2],
                output[offset + 3],
            ]) as usize;
            output = output[offset..].to_vec();
        }
        return Ok(output);
    }
}

fn save_file(path: &str, content: Vec<u8>) -> Result<bool, String> {
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
    return Ok(true);
}

fn extract_file(
    target_path: &str,
    archive_path: &str,
    offset: usize,
    compressed_size: usize,
    file_size: usize,
    compression_type: u8,
) -> Result<bool, String> {
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

fn build_basic_response(length: usize) -> ResponseBuilder {
    ResponseBuilder::new()
        .header("Origin", "*")
        .header("Access-Control-Allow-Origin", "*")
        .header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        .header("Access-Control-Allow-Headers", "*")
        .header("Content-Length", length)
}

fn build_ok_response(result: Vec<u8>) -> Result<tauri::http::Response, Box<dyn Error>> {
    build_basic_response(result.len())
        .mimetype("application/octet-stream")
        .status(200)
        .body(result)
}

fn build_error_response(err: String) -> Result<tauri::http::Response, Box<dyn Error>> {
    build_basic_response(err.len())
        .mimetype("text/plain")
        .status(500)
        .body(err.into_bytes())
}

fn build_options_response() -> Result<tauri::http::Response, Box<dyn Error>> {
    build_basic_response(0).status(200).body(vec![])
}

fn get_header_as_string<'a>(
    req: &'a tauri::http::Request,
    key: &'a str,
) -> Result<&'a str, String> {
    let header = req.headers().get(key);
    if header.is_none() {
        return Err(format!("Header {:?} not found", key));
    }
    let header = header.unwrap().to_str();
    if header.is_err() {
        return Err(format!("Header {:?} not found", key));
    }
    return Ok(header.unwrap());
}

fn get_header_as_number(req: &tauri::http::Request, key: &str) -> Result<usize, String> {
    let header = req.headers().get(key);
    if header.is_none() {
        return Err(format!("Header {:?} not found", key));
    }
    let header = header.unwrap().to_str();
    if header.is_err() {
        return Err(format!("Header {:?} not found", key));
    }
    let header = header.unwrap();
    let header = header.parse::<usize>();
    if header.is_err() {
        return Err(format!("Header {:?} not found", key));
    }
    return Ok(header.unwrap());
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs_extra::init())
        .register_uri_scheme_protocol("inflate", |_app, req| {
            if req.method() == "OPTIONS" {
                return build_options_response();
            }

            let buffer = req.body();
            let mut decoder = DeflateDecoder::new(buffer);
            match decoder.decode_zlib() {
                Ok(result) => build_ok_response(result),
                Err(err) => build_error_response(format!("Error: {:?}", err)),
            }
        })
        .register_uri_scheme_protocol("read-partial-file", |_app, req| {
            if req.method() == "OPTIONS" {
                return build_options_response();
            }

            let path = get_header_as_string(req, "path");
            if path.is_err() {
                return build_error_response(path.unwrap_err());
            }
            let path = path.unwrap();

            let length = get_header_as_number(req, "length");
            if length.is_err() {
                return build_error_response(length.unwrap_err());
            }
            let length = length.unwrap();

            let offset = get_header_as_number(req, "offset");
            if offset.is_err() {
                return build_error_response(offset.unwrap_err());
            }
            let offset = offset.unwrap();

            match read_partial_file(path, offset, length) {
                Ok(output) => build_ok_response(output),
                Err(err) => build_error_response(format!("Error: {:?}", err)),
            }
        })
        .register_uri_scheme_protocol("decompress", |_app, req| {
            if req.method() == "OPTIONS" {
                return build_options_response();
            }

            let path = get_header_as_string(req, "path");
            if path.is_err() {
                return build_error_response(path.unwrap_err());
            }
            let path = path.unwrap();

            let compressed_size = get_header_as_number(req, "compressed-size");
            if compressed_size.is_err() {
                return build_error_response(compressed_size.unwrap_err());
            }
            let compressed_size = compressed_size.unwrap();
            if compressed_size == 0 || compressed_size > 1024 * 1024 * 1024 {
                return build_error_response(format!(
                    "Invalid compressed_size: {:?} (must be between 1 and 1024 * 1024 * 1024)",
                    compressed_size
                ));
            }

            let offset = get_header_as_number(req, "offset");
            if offset.is_err() {
                return build_error_response(offset.unwrap_err());
            }
            let offset = offset.unwrap();

            let file_size = get_header_as_number(req, "file-size");
            if file_size.is_err() {
                return build_error_response(file_size.unwrap_err());
            }
            let file_size = file_size.unwrap();
            if file_size == 0 {
                return build_error_response(format!(
                    "Invalid file_size: {:?} (must be greater than 0)",
                    file_size
                ));
            }

            match decompress(path, offset, compressed_size, file_size) {
                Ok(output) => build_ok_response(output),
                Err(err) => build_error_response(err),
            }
        })
        .register_uri_scheme_protocol("extract-file", |_app, req| {
            if req.method() == "OPTIONS" {
                return build_options_response();
            }

            let target_path = get_header_as_string(req, "target-path");
            if target_path.is_err() {
                return build_error_response(target_path.unwrap_err());
            }
            let target_path = target_path.unwrap();

            let archive_path = get_header_as_string(req, "archive-path");
            if archive_path.is_err() {
                return build_error_response(archive_path.unwrap_err());
            }
            let archive_path = archive_path.unwrap();

            let compressed_size = get_header_as_number(req, "compressed-size");
            if compressed_size.is_err() {
                return build_error_response(compressed_size.unwrap_err());
            }
            let compressed_size = compressed_size.unwrap();
            if compressed_size == 0 || compressed_size > 1024 * 1024 * 1024 {
                return build_error_response(format!(
                    "Invalid compressed_size: {:?} (must be between 1 and 1024 * 1024 * 1024)",
                    compressed_size
                ));
            }

            let offset = get_header_as_number(req, "offset");
            if offset.is_err() {
                return build_error_response(offset.unwrap_err());
            }
            let offset = offset.unwrap();

            let file_size = get_header_as_number(req, "file-size");
            if file_size.is_err() {
                return build_error_response(file_size.unwrap_err());
            }
            let file_size = file_size.unwrap();
            if file_size == 0 {
                return build_error_response(format!(
                    "Invalid file_size: {:?} (must be greater than 0)",
                    file_size
                ));
            }
            let compression_type = get_header_as_number(req, "compression-type");
            if compression_type.is_err() {
                return build_error_response(compression_type.unwrap_err());
            }
            let compression_type = compression_type.unwrap();

            match extract_file(
                target_path,
                archive_path,
                offset,
                compressed_size,
                file_size,
                compression_type as u8,
            ) {
                Ok(output) => build_ok_response(vec![output as u8]),
                Err(err) => build_error_response(err),
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
