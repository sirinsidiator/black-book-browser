import type MnfArchive from '../mnf/MnfArchive.js';
import BufferReader, { FieldData, FieldType, type FieldDefinition } from '../util/BufferReader.js';
import { inflate } from '../util/FileUtil.js';
import ZOSFileTable from './ZOSFileTable.js';

const ZOSFT_FILE_ID = 'ZOSFT';
const SEGMENT_COUNT = 3; // seems this is always the case

const ZOSFT_HEADER_DEFINITIONS: FieldDefinition[] = [
    { type: FieldType.UINT16 },
    { type: FieldType.UINT32 },
    { type: FieldType.UINT32 },
    { type: FieldType.UINT32, name: 'entryCount' }
];

const hasRows = (data: FieldData, prefix: string, fieldName: string) =>
    ((data.named[prefix + fieldName]?.value as number) ?? 0) > 0;

const ZOSFT_SEGMENT_HEADER_DEFINITIONS: FieldDefinition[] = [
    { type: FieldType.UINT16 },
    { type: FieldType.UINT32 },
    { type: FieldType.UINT32, name: 'block0Rows' },
    { type: FieldType.UINT32, name: 'block1Rows' },
    { type: FieldType.UINT32, name: 'block2Rows' },
    {
        type: FieldType.UINT32,
        name: 'block0Size',
        condition: (data, prefix) => hasRows(data, prefix ?? '', 'block0Rows')
    },
    {
        type: FieldType.UINT32,
        name: 'block0CompressedSize',
        condition: (data, prefix) => hasRows(data, prefix ?? '', 'block0Rows')
    },
    {
        type: FieldType.BINARY,
        name: 'block0',
        condition: (data, prefix) => hasRows(data, prefix ?? '', 'block0Rows')
    },
    {
        type: FieldType.UINT32,
        name: 'block1Size',
        condition: (data, prefix) => hasRows(data, prefix ?? '', 'block1Rows')
    },
    {
        type: FieldType.UINT32,
        name: 'block1CompressedSize',
        condition: (data, prefix) => hasRows(data, prefix ?? '', 'block1Rows')
    },
    {
        type: FieldType.BINARY,
        name: 'block1',
        condition: (data, prefix) => hasRows(data, prefix ?? '', 'block1Rows')
    },
    {
        type: FieldType.UINT32,
        name: 'block2Size',
        condition: (data, prefix) => hasRows(data, prefix ?? '', 'block2Rows')
    },
    {
        type: FieldType.UINT32,
        name: 'block2CompressedSize',
        condition: (data, prefix) => hasRows(data, prefix ?? '', 'block2Rows')
    },
    {
        type: FieldType.BINARY,
        name: 'block2',
        condition: (data, prefix) => hasRows(data, prefix ?? '', 'block2Rows')
    }
];

const ZOSFT_FILENAME_LIST_DEFINITIONS: FieldDefinition[] = [
    { type: FieldType.UINT32, name: 'fileNameListSize' },
    { type: FieldType.STRING, name: 'fileNameList' }
];

export default class ZOSFileTableReader {
    async read(archive: MnfArchive): Promise<ZOSFileTable | null> {
        const content = await archive.getFileTableContent();
        console.log('ZOSFileTableReader.read', content.length, content);

        const reader = new BufferReader(content);
        const fileId = reader.readString(ZOSFT_FILE_ID.length);
        if (fileId === ZOSFT_FILE_ID) {
            const start1 = performance.now();
            const data = reader.readFields(ZOSFT_HEADER_DEFINITIONS);
            const named = data.named;
            const fileTable = new ZOSFileTable(data);

            const blocks: {
                namePrefix: string;
                segment: number;
                block: number;
                rows: number;
                data: Buffer;
                inflated?: Uint8Array;
            }[] = [];
            for (let i = 0; i < SEGMENT_COUNT; ++i) {
                const prefix = 'segment' + i;
                reader.readFields(ZOSFT_SEGMENT_HEADER_DEFINITIONS, data, prefix);

                const block0Rows = named[prefix + 'block0Rows'].value as number;
                if (block0Rows > 0) {
                    const namePrefix = prefix + 'block0';
                    blocks.push({
                        namePrefix,
                        segment: i,
                        block: 0,
                        rows: block0Rows,
                        data: named[namePrefix].value as Buffer
                    });
                }

                const block1Rows = named[prefix + 'block1Rows'].value as number;
                if (block1Rows > 0) {
                    const namePrefix = prefix + 'block1';
                    blocks.push({
                        namePrefix,
                        segment: i,
                        block: 1,
                        rows: block1Rows,
                        data: named[namePrefix].value as Buffer
                    });
                }

                const block2Rows = named[prefix + 'block2Rows'].value as number;
                if (block2Rows > 0) {
                    const namePrefix = prefix + 'block2';
                    blocks.push({
                        namePrefix,
                        segment: i,
                        block: 2,
                        rows: block2Rows,
                        data: named[namePrefix].value as Buffer
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
                    if (file) {
                        if (block.block === 0) {
                            file.readBlock0(block.segment, blockReader, block.namePrefix);
                        } else {
                            file.readBlock(
                                block.segment,
                                block.block,
                                blockReader,
                                block.namePrefix
                            );
                        }
                    }
                }
                if (!blockReader.hasReachedEnd()) {
                    console.warn('not all data read', block, blockReader);
                }
            }
            const start4 = performance.now();
            console.log('block data read in', start4 - start3);

            reader.readFields(ZOSFT_FILENAME_LIST_DEFINITIONS, data);
            for (let i = 0; i < (data.named['entryCount'].value as number); ++i) {
                fileTable.get(i).readFileName(named['fileNameList'].value as string);
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
