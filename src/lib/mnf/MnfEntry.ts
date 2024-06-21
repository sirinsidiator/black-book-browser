// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { FieldData } from '../util/BufferReader';
import type ZOSFileTableEntry from '../zosft/ZOSFileTableEntry';
import type MnfArchive from './MnfArchive';

export default class MnfEntry {
    data: FieldData;
    fileName?: string;
    tableEntry?: ZOSFileTableEntry;
    invalidOffset?: boolean;
    invalidSize?: boolean;
    archiveNumber?: number;
    offset?: number;
    compressedSize?: number;
    fileSize?: number;
    compressionType?: number;

    constructor(public readonly archive: MnfArchive) {
        this.data = new FieldData();
    }
}
