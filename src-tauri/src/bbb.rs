use std::fs::File;
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::Path;
use tauri::http;
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

fn inflate(buffer: Vec<u8>) -> Result<Vec<u8>, String> {
    let mut decoder = DeflateDecoder::new(buffer.as_slice());
    match decoder.decode_zlib() {
        Ok(result) => return Ok(result),
        Err(err) => return Err(format!("Error: {:?}", err)),
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

// fn get_header_as_string<'a>(req: &'a http::Request, key: &'a str) -> Result<&'a str, String> {
//     let header = req.headers().get(key);
//     if header.is_none() {
//         return Err(format!("Header {:?} not found", key));
//     }
//     let header = header.unwrap().to_str();
//     if header.is_err() {
//         return Err(format!("Header {:?} not found", key));
//     }
//     return Ok(header.unwrap());
// }

// fn get_header_as_number(req: &http::Request, key: &str) -> Result<usize, String> {
//     let header = req.headers().get(key);
//     if header.is_none() {
//         return Err(format!("Header {:?} not found", key));
//     }
//     let header = header.unwrap().to_str();
//     if header.is_err() {
//         return Err(format!("Header {:?} not found", key));
//     }
//     let header = header.unwrap();
//     let header = header.parse::<usize>();
//     if header.is_err() {
//         return Err(format!("Header {:?} not found", key));
//     }
//     return Ok(header.unwrap());
// }

fn get_params_from_request(req: http::Request<Vec<u8>>) -> Result<serde_json::Value, String> {
    let params = req.headers().get("params");
    if params.is_none() {
        return Err("Error: Header 'params' not found".to_string());
    }
    let params = params.unwrap().to_str();
    if params.is_err() {
        return Err("Error: Header 'params' not found".to_string());
    }
    let params = params.unwrap();
    let params = serde_json::from_str(params);
    if params.is_err() {
        return Err("Error: Failed to parse 'params' as JSON".to_string());
    }
    return Ok(params.unwrap());
}

pub fn handle_ipc_message(
    req: http::Request<Vec<u8>>,
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
    } else if path == "/extract-file" {
        match get_params_from_request(req) {
            Ok(params) => {
                let target_path = params["targetPath"].as_str().unwrap();
                let archive_path = params["archivePath"].as_str().unwrap();
                let offset = params["offset"].as_u64().unwrap() as usize;
                let compressed_size = params["compressedSize"].as_u64().unwrap() as usize;
                let file_size = params["fileSize"].as_u64().unwrap() as usize;
                let compression_type = params["compressionType"].as_u64().unwrap() as u8;
                result = extract_file(
                    target_path,
                    archive_path,
                    offset,
                    compressed_size,
                    file_size,
                    compression_type,
                );
            }
            Err(err) => {
                return build_error_response(err);
            }
        }
    } else {
        return build_error_response(format!("Error: Unknown path {:?}", path));
    }

    match result {
        Ok(result) => return build_ok_response(result),
        Err(err) => return build_error_response(format!("Error: {:?}", err)),
    }
}
