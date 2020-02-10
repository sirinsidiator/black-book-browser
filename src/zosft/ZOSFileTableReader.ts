import MnfArchive from '../mnf/MnfArchive.js';
import BufferReader, { FieldData, FieldDefinition, FieldType } from '../util/BufferReader.js';
import { inflate } from '../util/FileUtil.js';
import ZOSFileTable from './ZOSFileTable.js';

const ZOSFT_FILE_ID = 'ZOSFT';
const SEGMENT_COUNT = 3; // seems this is always the case

const ZOSFT_HEADER_DEFINITIONS: FieldDefinition[] = [
    { type: FieldType.UINT16 },
    { type: FieldType.UINT32 },
    { type: FieldType.UINT32 },
    { type: FieldType.UINT32, name: 'entryCount' },
];

let hasRows = (data: FieldData, prefix: string, fieldName: string) => data.named[prefix + fieldName].value > 0;

const ZOSFT_SEGMENT_HEADER_DEFINITIONS: FieldDefinition[] = [
    { type: FieldType.UINT16 },
    { type: FieldType.UINT32 },
    { type: FieldType.UINT32, name: 'block0Rows' },
    { type: FieldType.UINT32, name: 'block1Rows' },
    { type: FieldType.UINT32, name: 'block2Rows' },
    { type: FieldType.UINT32, name: 'block0Size', condition: (data, prefix) => hasRows(data, prefix, 'block0Rows') },
    { type: FieldType.UINT32, name: 'block0CompressedSize', condition: (data, prefix) => hasRows(data, prefix, 'block0Rows') },
    { type: FieldType.BINARY, name: 'block0', condition: (data, prefix) => hasRows(data, prefix, 'block0Rows') },
    { type: FieldType.UINT32, name: 'block1Size', condition: (data, prefix) => hasRows(data, prefix, 'block1Rows') },
    { type: FieldType.UINT32, name: 'block1CompressedSize', condition: (data, prefix) => hasRows(data, prefix, 'block1Rows') },
    { type: FieldType.BINARY, name: 'block1', condition: (data, prefix) => hasRows(data, prefix, 'block1Rows') },
    { type: FieldType.UINT32, name: 'block2Size', condition: (data, prefix) => hasRows(data, prefix, 'block2Rows') },
    { type: FieldType.UINT32, name: 'block2CompressedSize', condition: (data, prefix) => hasRows(data, prefix, 'block2Rows') },
    { type: FieldType.BINARY, name: 'block2', condition: (data, prefix) => hasRows(data, prefix, 'block2Rows') },
];

const ZOSFT_FILENAME_LIST_DEFINITIONS: FieldDefinition[] = [
    { type: FieldType.UINT32, name: 'fileNameListSize' },
    { type: FieldType.STRING, name: 'fileNameList' },
];

export default class ZOSFileTableReader {

    async read(archive: MnfArchive): Promise<ZOSFileTable> {
        let content = await archive.getFileTableContent();
        let reader = new BufferReader(content);
        let fileId = reader.readString(ZOSFT_FILE_ID.length);
        if (fileId === ZOSFT_FILE_ID) {
            let data = reader.readFields(ZOSFT_HEADER_DEFINITIONS);
            let named = data.named;
            let fileTable = new ZOSFileTable(data);

            for (let i = 0; i < SEGMENT_COUNT; ++i) {
                let prefix = 'segment' + i;
                reader.readFields(ZOSFT_SEGMENT_HEADER_DEFINITIONS, data, prefix);

                let block0Rows = named[prefix + 'block0Rows'].value as number;
                if (block0Rows > 0) {
                    let block0 = named[prefix + 'block0'].value as Buffer;
                    let block0Reader = new BufferReader(await inflate(block0));

                    for (let j = 0; j < block0Rows; j++) {
                        if (fileTable.get(j)) {
                            fileTable.get(j).readBlock0(i, block0Reader);
                        }
                    }
                    if (!block0Reader.hasReachedEnd()) {
                        console.warn('not all data read for block0 in', prefix, block0Reader);
                    }
                }

                let block1Rows = named[prefix + 'block1Rows'].value as number;
                if (block1Rows > 0) {
                    let block1 = named[prefix + 'block1'].value as Buffer;
                    let block1Reader = new BufferReader(await inflate(block1));
                    for (let j = 0; j < block1Rows; j++) {
                        if (fileTable.get(j)) {
                            fileTable.get(j).readBlock(i, 1, block1Reader);
                        }
                    }
                    if (!block1Reader.hasReachedEnd()) {
                        console.warn('not all data read for block1 in', prefix, block1Reader);
                    }
                }

                let block2Rows = named[prefix + 'block2Rows'].value as number;
                if (block2Rows > 0) {
                    let block2 = named[prefix + 'block2'].value as Buffer;
                    let block2Reader = new BufferReader(await inflate(block2));
                    for (let j = 0; j < block2Rows; j++) {
                        if (fileTable.get(j)) {
                            fileTable.get(j).readBlock(i, 2, block2Reader);
                        }
                    }
                    if (!block2Reader.hasReachedEnd()) {
                        console.warn('not all data read for block2 in', prefix, block2Reader);
                    }
                }
            }

            reader.readFields(ZOSFT_FILENAME_LIST_DEFINITIONS, data);
            for (let i = 0; i < data.named['entryCount'].value; ++i) {
                fileTable.get(i).readFileName(named['fileNameList'].value as string);
            }

            let eofMarker = reader.readString(ZOSFT_FILE_ID.length);
            if (eofMarker !== ZOSFT_FILE_ID) {
                console.warn('incorrect eof marker', eofMarker);
            }

            return fileTable;
        }
        return null;
    }

}
