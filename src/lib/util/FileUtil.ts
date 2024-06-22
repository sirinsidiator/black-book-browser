// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { ExtractFilesProgress, ExtractFilesResult } from '$lib/mnf/MnfArchive';
import type MnfArchiveFile from '$lib/mnf/MnfArchiveFile';
import type MnfEntry from '$lib/mnf/MnfEntry';
import { convertFileSrc } from '@tauri-apps/api/core';
import * as path from '@tauri-apps/api/path';
import { stat } from '@tauri-apps/plugin-fs';

const BYTE_UNIT = ['bytes', 'kB', 'MB', 'GB', 'TB'];
export function formatFileSize(size: number, showBytes = true): string {
    let converted = size;
    let prefix = 0;
    while (converted >= 1024 && prefix < BYTE_UNIT.length) {
        converted /= 1024;
        prefix++;
    }
    let convertedString =
        converted.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' ' + BYTE_UNIT[prefix];
    if (showBytes) {
        convertedString += ' (' + size.toLocaleString() + ' bytes)';
    }
    return convertedString;
}

export async function inflate(buffer: Uint8Array): Promise<Uint8Array> {
    const url = convertFileSrc('inflate', 'bbb');
    const response = await fetch(url, {
        method: 'POST',
        body: buffer
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
    }
    const content = await response.arrayBuffer();
    return new Uint8Array(content);
}

export async function getFileSize(path: string): Promise<number> {
    const meta = await stat(path);
    return meta.size;
}

export async function readPartialFile(
    path: string,
    offset: number,
    length: number
): Promise<Uint8Array> {
    const url = convertFileSrc('read-partial-file', 'bbb');
    const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ path, offset, length })
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
    }
    const content = await response.arrayBuffer();
    return new Uint8Array(content);
}

export async function extractFiles(
    files: {
        target: string;
        archiveFile: MnfArchiveFile;
        fileEntry: MnfEntry;
    }[],
    decompress: boolean
): Promise<ExtractFilesResult> {
    const url = convertFileSrc('extract-files', 'bbb');
    const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(
            files.map((file) => ({
                targetPath: file.target,
                archivePath: file.archiveFile.path,
                offset: file.fileEntry.offset,
                compressedSize: file.fileEntry.compressedSize,
                fileSize: file.fileEntry.fileSize,
                compressionType: !decompress ? 0 : file.fileEntry.compressionType
            }))
        )
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
    }
    return response.json() as Promise<ExtractFilesResult>;
}

export async function getExtractFileProgress(): Promise<ExtractFilesProgress> {
    const url = convertFileSrc('extract-files-progress', 'bbb');
    const response = await fetch(url);
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
    }
    return response.json() as Promise<ExtractFilesProgress>;
}

export async function decompress(
    path: string,
    offset: number,
    compressedSize: number,
    fileSize: number
): Promise<Uint8Array> {
    const url = convertFileSrc('decompress', 'bbb');
    const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ path, offset, compressedSize, fileSize })
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
    }
    const content = await response.arrayBuffer();
    return new Uint8Array(content);
}

export function basename(pathString: string, ext?: string): Promise<string> {
    return path.basename(pathString, ext);
}

export function dirname(pathString: string): Promise<string> {
    return path.dirname(pathString);
}

export function resolve(...paths: string[]) {
    return path.resolve(...paths);
}
