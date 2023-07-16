import { readBinaryFile } from '@tauri-apps/api/fs';
import BufferReader, {
    Field,
    FieldData,
    FieldType,
    toHex,
    type FieldDefinition
} from '../util/BufferReader.js';
import { inflate } from '../util/FileUtil.js';
import MnfArchive from './MnfArchive.js';
import MnfEntry from './MnfEntry.js';

export enum MnfType {
    UNKNOWN,
    V2,
    V3
}

const FILE_ID = 'MES2';
const UNMAPPED_DIR = '/unmapped/';
const KNOWN_BLOCK0_VALUES: any = {};
KNOWN_BLOCK0_VALUES[0x80] = true;
KNOWN_BLOCK0_VALUES[0x40] = true;
KNOWN_BLOCK0_VALUES[0x00] = true;

const hasExtraBlock = (data: FieldData) => data.named['blockType1'].value === 0;
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

const BLOCK1_FIELD_DEFINITIONS: FieldDefinition[] = [
    { type: FieldType.UINT32, name: 'fileNumber' },
    { type: FieldType.UINT32, name: 'flags' }
];

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
    const named = archive.data.named;
    const fileCount = named['fileCount2'].value as number;
    named['block0'].value = await inflate(named['block0'].value as Buffer);
    named['block1'].value = await inflate(named['block1'].value as Buffer);
    named['block2'].value = await inflate(named['block2'].value as Buffer);

    // block0 seems to contain some kind of file id table with 4 bytes width
    // first 3 byte are a unique number and 4th byte is a flag
    // 0x00 or 0x40 (as seen in eso.mnf) seems to indicate removed files
    // 0x80 otherwise for existing files
    const block0 = new BufferReader(named['block0'].value);
    const block1 = new BufferReader(named['block1'].value);
    const block2 = new BufferReader(named['block2'].value);

    let skipFlaggedEntries = false;
    let fileTableFileNumber = -1;
    if (archive.path.endsWith('game.mnf')) {
        fileTableFileNumber = 0;
    } else if (archive.path.endsWith('eso.mnf')) {
        fileTableFileNumber = 0xffffff;
        skipFlaggedEntries = false;
    } // TODO find a way to do this without hard coded values

    for (let i = 0; i < fileCount; ++i) {
        const entry = new MnfEntry();

        const indexField = new Field(ENTRY_FIELD_DEFINITION_INDEX, -1);
        indexField.value = i;
        entry.data.add(indexField);

        const rowCountField = new Field(BLOCK0_FIELD_DEFINITION_ROW_COUNT, -1);
        rowCountField.value = 0;
        entry.data.add(rowCountField);

        const idField = new Field(BLOCK0_FIELD_DEFINITION_ID);
        idField.value = 0;
        entry.data.add(idField);

        const typeField = new Field(BLOCK0_FIELD_DEFINITION_TYPE, 3);
        typeField.value = 0;
        entry.data.add(typeField);

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

        block1.readFields(BLOCK1_FIELD_DEFINITIONS, entry.data);
        block2.readFields(BLOCK2_FIELD_DEFINITIONS, entry.data);

        const named = entry.data.named;
        const offset = named['offset'].value as number;
        const fileNumber = named['fileNumber'].value as number;
        const compressedSize = named['compressedSize'].value as number;
        const flags = named['flags'].value as number;

        const archiveFile = await archive.getArchiveFile(entry);
        const prefix = UNMAPPED_DIR + archiveFile.prefix + '/file';
        if (typeField.value === 0x80) {
            entry.fileName = prefix + idField.value + '.dat';
        } else {
            entry.fileName = prefix + '@' + toHex(offset) + '.dat';
        }

        entry.invalidOffset = offset > archiveFile.size;
        entry.invalidSize = offset + compressedSize > archiveFile.size;
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
}

export default class MnfReader {
    async read(path: string): Promise<MnfArchive> {
        try {
            const content = await readBinaryFile(path);
            console.log('read', path, content.byteLength);
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

            const fields = file.readFields(MNF_FIELD_DEFINITIONS);
            const archive = new MnfArchive(path, file, fields);
            console.log('archive', archive);
            await extractContent(archive);
            console.log('extracted', archive);
            await archive.finalize();
            console.log('finalized', archive);
            return archive;
        } catch (err) {
            console.error('Failed to read ' + path, err);
            throw err;
        }
    }

    getArchive(path: string): MnfArchive | undefined {
        return;
    }

    getArchives(): Map<string, MnfArchive> {
        return new Map();
    }
}
