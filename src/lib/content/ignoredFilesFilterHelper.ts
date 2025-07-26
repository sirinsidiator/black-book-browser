// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { MnfFileData } from '$lib/mnf/MnfFileData';
import { openUrl } from '@tauri-apps/plugin-opener';
import picomatch from 'picomatch';

const CHUNK_SIZE = 100000;
const HELP_URL = 'https://www.npmjs.com/package/picomatch#globbing-features';

function genrerateIsMatch(pattern: string) {
    return picomatch(pattern);
}

export function isIgnoredPath(path: string, pattern?: string): boolean {
    if (pattern) {
        const isMatch = genrerateIsMatch(pattern);
        return isMatch(path);
    }
    return false;
}

export async function filterIgnoredFiles(
    pattern: string,
    files: MnfFileData[]
): Promise<MnfFileData[]> {
    const start = performance.now();
    const isMatch = picomatch(pattern);
    const resultChunks = [];
    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        const chunk = files.slice(i, i + CHUNK_SIZE);
        resultChunks.push(await filterIgnoredFilesChunk(isMatch, chunk));
    }
    const result = resultChunks.flat();
    console.log(
        `Filtered ${files.length.toLocaleString()} files in ${(performance.now() - start).toFixed(2)}ms`
    );
    return result;
}

async function filterIgnoredFilesChunk(
    isMatch: picomatch.Matcher,
    chunk: MnfFileData[]
): Promise<MnfFileData[]> {
    return new Promise((resolve) => {
        setTimeout(() => {
            const remaining = chunk.filter((entry) => !isMatch(entry.fileName));
            resolve(remaining);
        }, 0);
    });
}

export function openIgnorePatternHelp() {
    openUrl(HELP_URL).catch((error: unknown) => {
        console.error('Failed to open ignore pattern help:', error);
    });
}
