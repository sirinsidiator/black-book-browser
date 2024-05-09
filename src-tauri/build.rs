fn main() {
    cxx_build::bridge("src/bbb.rs")
        .include("include")
        .file("src/kraken.cpp")
        .file("src/bitknit.cpp")
        .file("src/lzna.cpp")
        .flag_if_supported("-fno-exceptions")
        .compile("cxx-black-book-browser");
    tauri_build::build()
}
