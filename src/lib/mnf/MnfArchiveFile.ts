// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { readPartialFile } from '../util/FileUtil.js';
import type MnfEntry from './MnfEntry.js';

export default class MnfArchiveFile {
    constructor(
        public readonly path: string,
        public readonly prefix: string,
        public readonly size: number
    ) {}

    async loadContent(entry: MnfEntry): Promise<Uint8Array> {
        console.log('loadContent', entry);
        return readPartialFile(this.path, entry.offset!, entry.compressedSize!);
    }
}
