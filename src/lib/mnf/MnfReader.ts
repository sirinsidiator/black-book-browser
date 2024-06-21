// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { inflate, readPartialFile } from '$lib/util/FileUtil.js';
import BufferReader, {
    Field,
    FieldData,
    FieldType,
    toHex,
    type FieldDefinition
} from '../util/BufferReader.js';
import MnfArchive from './MnfArchive.js';
import MnfEntry from './MnfEntry.js';

export enum MnfType {
    UNKNOWN,
    V2,
    V3
}

interface Block0Values {
    [index: number]: boolean;
}

const FILE_ID = 'MES2';
const UNMAPPED_DIR = '/unmapped/';
const KNOWN_BLOCK0_VALUES: Block0Values = {};
KNOWN_BLOCK0_VALUES[0x80] = true;
KNOWN_BLOCK0_VALUES[0x40] = true;
KNOWN_BLOCK0_VALUES[0x00] = true;

const NUM_ARCHIVE_FILES_INDEX = 0;
const BLOCK1_TYPE_INDEX = 4;
const FILE_COUNT2_INDEX = 14;
const BLOCK0_DATA_INDEX = 17;
const BLOCK1_DATA_INDEX = 20;
const BLOCK2_DATA_INDEX = 23;

const hasExtraBlock = (data: FieldData, offset: number) =>
    data.get(offset + BLOCK1_TYPE_INDEX) === 0;
const MNF_FIELD_DEFINITIONS: FieldDefinition[] = [
    { type: FieldType.UINT16, name: 'numArchiveFiles' },
    { type: FieldType.UINT16_ARRAY, name: 'archiveFileLookup' },
    { type: FieldType.UINT32, bigEndian: true },
    { type: FieldType.UINT32, name: 'eofOffset' },
    { type: FieldType.UINT16, name: 'blockType1', bigEndian: true },
    // when type2 = 0 there is some additional header data to read (e.g. in eso.mnf)
    { type: FieldType.UINT16, bigEndian: true, condition: hasExtraBlock },
    {
        type: FieldType.UINT32,
        bigEndian: true,
        name: 'unknownBlock1Size',
        condition: hasExtraBlock
    },
    { type: FieldType.BINARY, name: 'unknownBlock1', condition: hasExtraBlock },
    {
        type: FieldType.UINT32,
        bigEndian: true,
        name: 'unknownBlock2Size',
        condition: hasExtraBlock
    },
    { type: FieldType.BINARY, name: 'unknownBlock2', condition: hasExtraBlock },
    { type: FieldType.UINT16, bigEndian: true, name: 'blockType2', condition: hasExtraBlock },
    { type: FieldType.UINT32, bigEndian: true },
    { type: FieldType.UINT32, bigEndian: true },
    { type: FieldType.UINT32, bigEndian: true, name: 'fileCount1' },
    { type: FieldType.UINT32, bigEndian: true, name: 'fileCount2' },
    { type: FieldType.UINT32, bigEndian: true, name: 'blockSize0' },
    { type: FieldType.UINT32, bigEndian: true, name: 'compressedBlockSize0' },
    { type: FieldType.BINARY, name: 'block0' },
    { type: FieldType.UINT32, bigEndian: true, name: 'blockSize1' },
    { type: FieldType.UINT32, bigEndian: true, name: 'compressedBlockSize1' },
    { type: FieldType.BINARY, name: 'block1' },
    { type: FieldType.UINT32, bigEndian: true, name: 'blockSize2' },
    { type: FieldType.UINT32, bigEndian: true, name: 'compressedBlockSize2' },
    { type: FieldType.BINARY, name: 'block2' }
];

const ENTRY_FIELD_DEFINITION_INDEX: FieldDefinition = { type: FieldType.UINT32, name: 'index' };
const BLOCK0_FIELD_DEFINITION_ID: FieldDefinition = { type: FieldType.UINT32, name: 'id' };
const BLOCK0_FIELD_DEFINITION_TYPE: FieldDefinition = { type: FieldType.UINT8, name: 'type' };
const BLOCK0_FIELD_DEFINITION_ROW_COUNT: FieldDefinition = {
    type: FieldType.UINT8,
    name: 'block0Rows'
};

const BLOCK1_FILE_NUMBER_INDEX = 0;
const BLOCK1_FLAGS_INDEX = 1;
const BLOCK1_FIELD_DEFINITIONS: FieldDefinition[] = [
    { type: FieldType.UINT32, name: 'fileNumber' },
    { type: FieldType.UINT32, name: 'flags' }
];

const BLOCK2_DECOMPRESSED_SIZE_INDEX = 0;
const BLOCK2_COMPRESSED_SIZE_INDEX = 1;
const BLOCK2_OFFSET_INDEX = 3;
const BLOCK2_ARCHIVE_NUMBER_INDEX = 4;
const BLOCK2_COMPRESSION_TYPE_INDEX = 6;
const BLOCK2_FIELD_DEFINITIONS: FieldDefinition[] = [
    { type: FieldType.UINT32, name: 'fileSize' },
    { type: FieldType.UINT32, name: 'compressedSize' },
    { type: FieldType.UINT32 },
    { type: FieldType.UINT32, name: 'offset' },
    { type: FieldType.UINT8, name: 'archiveNumber' },
    { type: FieldType.UINT8 },
    { type: FieldType.UINT16, name: 'compressionType' }
];

async function extractContent(archive: MnfArchive) {
    const data = archive.data;
    const fileCount = data.get<number>(FILE_COUNT2_INDEX);
    const startInflate = performance.now();
    await Promise.all([
        inflate(data.get(BLOCK0_DATA_INDEX)).then((buffer) => data.set(BLOCK0_DATA_INDEX, buffer)),
        inflate(data.get(BLOCK1_DATA_INDEX)).then((buffer) => data.set(BLOCK1_DATA_INDEX, buffer)),
        inflate(data.get(BLOCK2_DATA_INDEX)).then((buffer) => data.set(BLOCK2_DATA_INDEX, buffer))
    ]);
    console.log('headers inflated in', performance.now() - startInflate, 'ms');

    // block0 seems to contain some kind of file id table with 4 bytes width
    // first 3 byte are a unique number and 4th byte is a flag
    // 0x00 or 0x40 (as seen in eso.mnf) seems to indicate removed files
    // 0x80 otherwise for existing files
    const block0 = new BufferReader(data.get(BLOCK0_DATA_INDEX));
    const block1 = new BufferReader(data.get(BLOCK1_DATA_INDEX));
    const block2 = new BufferReader(data.get(BLOCK2_DATA_INDEX));

    let skipFlaggedEntries = false;
    let fileTableFileNumber = -1;
    if (archive.path.endsWith('game.mnf')) {
        fileTableFileNumber = 0;
    } else if (archive.path.endsWith('eso.mnf')) {
        fileTableFileNumber = 0xffffff;
        skipFlaggedEntries = false;
    } // TODO find a way to do this without hard coded values

    const startCreateFiles = performance.now();
    for (let i = 0; i < fileCount; ++i) {
        const entry = new MnfEntry(archive);
        const data = entry.data;

        const indexField = new Field(ENTRY_FIELD_DEFINITION_INDEX, -1);
        indexField.value = i;
        data.add(indexField);

        const rowCountField = new Field(BLOCK0_FIELD_DEFINITION_ROW_COUNT, -1);
        rowCountField.value = 0;
        data.add(rowCountField);

        const idField = new Field(BLOCK0_FIELD_DEFINITION_ID);
        idField.value = 0;
        data.add(idField);

        const typeField = new Field(BLOCK0_FIELD_DEFINITION_TYPE, 3);
        typeField.value = 0;
        data.add(typeField);

        do {
            // need to skip empty rows
            if (!block0.hasReachedEnd()) {
                rowCountField.value++;
                const value = block0.readUInt32();
                idField.value = value & 0xffffff;
                typeField.value = value >>> 24;
                if (
                    !KNOWN_BLOCK0_VALUES[typeField.value] ||
                    (typeField.value !== 0x80 && idField.value > 0)
                ) {
                    console.warn('Unexpected value in block0', entry);
                }
            } else {
                // eso.mnf doesn't seem to have enough entrys that are not 0
                idField.value = -1;
                typeField.value = -1;
                break;
            }
        } while (typeField.value === 0);

        const offset1 = block1.readFields(BLOCK1_FIELD_DEFINITIONS, data);
        const offset2 = block2.readFields(BLOCK2_FIELD_DEFINITIONS, data);

        const byteOffset = data.get<number>(offset2 + BLOCK2_OFFSET_INDEX);
        const fileNumber = data.get<number>(offset1 + BLOCK1_FILE_NUMBER_INDEX);
        const compressedSize = data.get<number>(offset2 + BLOCK2_COMPRESSED_SIZE_INDEX);
        const flags = data.get<number>(offset1 + BLOCK1_FLAGS_INDEX);
        entry.archiveNumber = data.get<number>(offset2 + BLOCK2_ARCHIVE_NUMBER_INDEX);
        entry.offset = byteOffset;
        entry.compressedSize = compressedSize;
        entry.fileSize = data.get<number>(offset2 + BLOCK2_DECOMPRESSED_SIZE_INDEX);
        entry.compressionType = data.get<number>(offset2 + BLOCK2_COMPRESSION_TYPE_INDEX);

        const archiveFile = archive.getArchiveFile(entry);
        const prefix = UNMAPPED_DIR + archiveFile.prefix + '/file';
        if (typeField.value === 0x80) {
            entry.fileName = prefix + idField.value + '.dat';
        } else {
            entry.fileName = prefix + '@' + toHex(byteOffset) + '.dat';
        }

        entry.invalidOffset = byteOffset > archiveFile.size;
        entry.invalidSize = byteOffset + compressedSize > archiveFile.size;
        if (!entry.invalidOffset && !entry.invalidSize) {
            if (!skipFlaggedEntries || flags === 0) {
                archive.fileEntries.set(fileNumber, entry);
            }
            archive.mnfEntries.set(i, entry);
        }

        if (fileNumber === fileTableFileNumber) {
            if (!archive.fileTableEntry) {
                archive.fileTableEntry = entry;
            } else {
                console.warn('more than one file table detected in', archive.path);
            }
        }
    }
    console.log('files created in', performance.now() - startCreateFiles, 'ms');
}

export default class MnfReader {
    async read(path: string, compressedSize: number): Promise<MnfArchive> {
        try {
            console.log('read', path);
            const startTime = performance.now();
            const content = await readPartialFile(path, 0, compressedSize);
            console.log(
                'finished reading',
                path,
                content.length,
                'bytes in',
                (performance.now() - startTime).toFixed(1),
                'ms'
            );
            const file = new BufferReader(content);

            const header = file.readString(FILE_ID.length);
            console.log('header', header);
            if (header !== FILE_ID) {
                throw new Error('Invalid .mnf file');
            }

            const version = file.readUInt16();
            console.log('version', version);
            if (version !== 3) {
                throw new Error('Unsupported .mnf version (v' + version + ')');
            }

            const fields = new FieldData();
            file.readFields(MNF_FIELD_DEFINITIONS, fields);
            const archive = new MnfArchive(path, file, fields);
            const beforeInit = performance.now();
            await archive.initArchiveFiles(fields.get<number>(NUM_ARCHIVE_FILES_INDEX));
            const beforeExtract = performance.now();
            console.log('archive', archive, 'initialized in', beforeExtract - beforeInit, 'ms');
            await extractContent(archive);
            const beforeFinalize = performance.now();
            console.log('extracted', archive, 'in', beforeFinalize - beforeExtract, 'ms');
            await archive.finalize();
            console.log('finalized', archive, 'in', performance.now() - beforeFinalize, 'ms');
            return archive;
        } catch (err) {
            console.error('Failed to read ' + path, err);
            throw err;
        }
    }

    getArchive(path: string): MnfArchive | undefined {
        console.warn('getArchive not implemented', path);
        return;
    }

    getArchives(): Map<string, MnfArchive> {
        return new Map();
    }
}
