// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type MnfArchive from '../mnf/MnfArchive.js';
import BufferReader, { FieldData, FieldType, type FieldDefinition } from '../util/BufferReader.js';
import { inflate } from '../util/FileUtil.js';
import ZOSFileTable from './ZOSFileTable.js';

const ZOSFT_FILE_ID = 'ZOSFT';
const SEGMENT_COUNT = 3; // seems this is always the case

const ENTRY_COUNT_INDEX = 3;

const ZOSFT_HEADER_DEFINITIONS: FieldDefinition[] = [
    { type: FieldType.UINT16 },
    { type: FieldType.UINT32 },
    { type: FieldType.UINT32 },
    { type: FieldType.UINT32, name: 'entryCount' }
];

const hasRows = (data: FieldData, index: number) => (data.get<number>(index) ?? 0) > 0;

const BLOCK0_ROWS_INDEX = 2;
const BLOCK1_ROWS_INDEX = 3;
const BLOCK2_ROWS_INDEX = 4;
const BLOCK0_DATA_INDEX = 7;
const BLOCK1_DATA_INDEX = 10;
const BLOCK2_DATA_INDEX = 13;

const ZOSFT_SEGMENT_HEADER_DEFINITIONS: FieldDefinition[] = [
    { type: FieldType.UINT16 },
    { type: FieldType.UINT32 },
    { type: FieldType.UINT32, name: 'block0Rows' },
    { type: FieldType.UINT32, name: 'block1Rows' },
    { type: FieldType.UINT32, name: 'block2Rows' },
    {
        type: FieldType.UINT32,
        name: 'block0Size',
        condition: (data, offset) => hasRows(data, offset + BLOCK0_ROWS_INDEX)
    },
    {
        type: FieldType.UINT32,
        name: 'block0CompressedSize',
        condition: (data, offset) => hasRows(data, offset + BLOCK0_ROWS_INDEX)
    },
    {
        type: FieldType.BINARY,
        name: 'block0',
        condition: (data, offset) => hasRows(data, offset + BLOCK0_ROWS_INDEX)
    },
    {
        type: FieldType.UINT32,
        name: 'block1Size',
        condition: (data, offset) => hasRows(data, offset + BLOCK1_ROWS_INDEX)
    },
    {
        type: FieldType.UINT32,
        name: 'block1CompressedSize',
        condition: (data, offset) => hasRows(data, offset + BLOCK1_ROWS_INDEX)
    },
    {
        type: FieldType.BINARY,
        name: 'block1',
        condition: (data, offset) => hasRows(data, offset + BLOCK1_ROWS_INDEX)
    },
    {
        type: FieldType.UINT32,
        name: 'block2Size',
        condition: (data, offset) => hasRows(data, offset + BLOCK2_ROWS_INDEX)
    },
    {
        type: FieldType.UINT32,
        name: 'block2CompressedSize',
        condition: (data, offset) => hasRows(data, offset + BLOCK2_ROWS_INDEX)
    },
    {
        type: FieldType.BINARY,
        name: 'block2',
        condition: (data, offset) => hasRows(data, offset + BLOCK2_ROWS_INDEX)
    }
];

const FILE_NAME_LIST_INDEX = 1;

const ZOSFT_FILENAME_LIST_DEFINITIONS: FieldDefinition[] = [
    { type: FieldType.UINT32, name: 'fileNameListSize' },
    { type: FieldType.STRING, name: 'fileNameList' }
];

interface BlockData {
    segment: number;
    block: number;
    rows: number;
    data: Buffer;
    inflated?: Uint8Array;
}

export default class ZOSFileTableReader {
    async read(archive: MnfArchive): Promise<ZOSFileTable | null> {
        const content = await archive.getFileTableContent();
        console.log('ZOSFileTableReader.read', content.length, content);

        const reader = new BufferReader(content);
        const fileId = reader.readString(ZOSFT_FILE_ID.length);
        if (fileId === ZOSFT_FILE_ID) {
            const start1 = performance.now();
            const data = new FieldData();
            reader.readFields(ZOSFT_HEADER_DEFINITIONS, data);
            const entryCount = data.get<number>(ENTRY_COUNT_INDEX);
            const fileTable = new ZOSFileTable(data, entryCount);

            const blocks: BlockData[] = [];
            for (let i = 0; i < SEGMENT_COUNT; ++i) {
                const offset = reader.readFields(ZOSFT_SEGMENT_HEADER_DEFINITIONS, data);

                const block0Rows = data.get<number>(offset + BLOCK0_ROWS_INDEX);
                if (block0Rows > 0) {
                    blocks.push({
                        segment: i,
                        block: 0,
                        rows: block0Rows,
                        data: data.get<Buffer>(offset + BLOCK0_DATA_INDEX)
                    });
                }

                const block1Rows = data.get<number>(offset + BLOCK1_ROWS_INDEX);
                if (block1Rows > 0) {
                    blocks.push({
                        segment: i,
                        block: 1,
                        rows: block1Rows,
                        data: data.get<Buffer>(offset + BLOCK1_DATA_INDEX)
                    });
                }

                const block2Rows = data.get<number>(offset + BLOCK2_ROWS_INDEX);
                if (block2Rows > 0) {
                    blocks.push({
                        segment: i,
                        block: 2,
                        rows: block2Rows,
                        data: data.get<Buffer>(offset + BLOCK2_DATA_INDEX)
                    });
                }
            }
            const start2 = performance.now();
            console.log('block data collected in', start2 - start1);

            await Promise.all(
                blocks.map((block) =>
                    inflate(block.data).then((inflated) => {
                        block.inflated = inflated;
                    })
                )
            );

            const start3 = performance.now();
            console.log('block data inflated in', start3 - start2);

            for (const block of blocks) {
                const blockReader = new BufferReader(block.inflated!);
                for (let j = 0; j < block.rows; j++) {
                    const file = fileTable.get(j);
                    file?.readBlock(block.segment, block.block, blockReader);
                }
                if (!blockReader.hasReachedEnd()) {
                    console.warn('not all data read', block, blockReader);
                }
            }
            const start4 = performance.now();
            console.log('block data read in', start4 - start3);

            const offset = reader.readFields(ZOSFT_FILENAME_LIST_DEFINITIONS, data);
            const fileNames = data.get<string>(offset + FILE_NAME_LIST_INDEX);
            for (let i = 0; i < entryCount; ++i) {
                fileTable.get(i).readFileName(fileNames);
            }

            const eofMarker = reader.readString(ZOSFT_FILE_ID.length);
            if (eofMarker !== ZOSFT_FILE_ID) {
                console.warn('incorrect eof marker', eofMarker);
            }
            console.log('file table read in', performance.now() - start4);

            return fileTable;
        } else {
            console.warn('incorrect fileId', fileId);
        }
        return null;
    }
}
