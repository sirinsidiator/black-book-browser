// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { FieldData } from '../util/BufferReader.js';
import ZOSFileTableEntry from './ZOSFileTableEntry.js';

export default class ZOSFileTable {
    data: FieldData;
    entries: ZOSFileTableEntry[];

    constructor(data: FieldData, entryCount: number) {
        this.data = data;
        this.entries = [];
        for (let i = 0; i < entryCount; ++i) {
            this.entries.push(new ZOSFileTableEntry(i));
        }
    }

    get(index: number): ZOSFileTableEntry {
        return this.entries[index];
    }

    forEach(
        callbackfn: (value: ZOSFileTableEntry, index: number, array: ZOSFileTableEntry[]) => void
    ) {
        this.entries.forEach(callbackfn);
    }
}
