import type MnfEntry from '../mnf/MnfEntry.js';
import BufferReader, {
    Field,
    FieldData,
    FieldType,
    type FieldDefinition
} from '../util/BufferReader.js';

const ENTRY_FIELD_DEFINITION_INDEX: FieldDefinition = { type: FieldType.UINT32, name: 'index' };
const BLOCK1_FIELD_DEFINITION_ID: FieldDefinition = { type: FieldType.UINT32, name: 'id' };
const BLOCK1_FIELD_DEFINITION_TYPE: FieldDefinition = { type: FieldType.UINT8, name: 'type' };
const BLOCK1_FIELD_DEFINITION_ROW_COUNT: FieldDefinition = { type: FieldType.UINT8, name: 'rows' };

const FILE_NUMBER_INDEX = 0;
const NAME_OFFSET_INDEX = 1;
const ENTRY_BLOCK_DEFINITIONS: FieldDefinition[][][] = [
    [
        // segment 0
        [], // block 0 is read separately, but we need it for the indexing
        [
            // block 1
            { type: FieldType.UINT32 },
            { type: FieldType.UINT32 }
        ],
        [
            // block 2
            { type: FieldType.UINT32, name: 'fileNumber' }
        ]
    ],
    [
        // segment 1
        [],
        [
            // block 1
            { type: FieldType.UINT32, name: 'fileNumber' }
        ],
        [
            // block 2
            { type: FieldType.UINT32, name: 'fileNumber' },
            { type: FieldType.UINT32, name: 'nameOffset' },
            { type: FieldType.UINT32 },
            { type: FieldType.UINT32 }
        ]
    ],
    [
        // segment 2
        [],
        [
            // block 1
            { type: FieldType.UINT32 }
        ],
        [
            // block 2
            { type: FieldType.UINT32 }
        ]
    ]
];

const KNOWN_BLOCK1_VALUES: { [index: number]: boolean } = {};
KNOWN_BLOCK1_VALUES[0x80] = true;
KNOWN_BLOCK1_VALUES[0x40] = true;
KNOWN_BLOCK1_VALUES[0x00] = true;

export default class ZOSFileTableEntry {
    data: FieldData;
    fileName?: string;
    fileEntry?: MnfEntry;
    nameOffset?: number;
    fileNumber?: number;

    constructor(index: number) {
        this.data = new FieldData();

        const indexField = new Field(ENTRY_FIELD_DEFINITION_INDEX, -1);
        indexField.value = index;
        this.data.add(indexField);
    }

    readBlock(segment: number, block: number, reader: BufferReader) {
        const data = this.data;
        if (block === 0) {
            let rowCount = 0;
            let id = 0;
            let type = 0;
            do {
                // need to skip empty rows
                if (!reader.hasReachedEnd()) {
                    rowCount++;
                    const value = reader.readUInt32();
                    id = value & 0xffffff;
                    type = value >>> 24;
                    if (!KNOWN_BLOCK1_VALUES[type] || (type !== 0x80 && id > 0)) {
                        console.warn('Unexpected value in segmnet', segment, 'block', block, this);
                    }
                } else {
                    // eso.mnf doesn't seem to have enough entrys that are not 0
                    id = -1;
                    type = -1;
                    break;
                }
            } while (type === 0);

            const rowCountField = new Field(BLOCK1_FIELD_DEFINITION_ROW_COUNT, -1);
            rowCountField.value = rowCount;
            data.add(rowCountField);

            const idField = new Field(BLOCK1_FIELD_DEFINITION_ID);
            idField.value = id;
            data.add(idField);

            const typeField = new Field(BLOCK1_FIELD_DEFINITION_TYPE, 3);
            typeField.value = type;
            data.add(typeField);
        } else {
            const definitions = ENTRY_BLOCK_DEFINITIONS[segment][block];
            const offset = reader.readFields(definitions, data);
            if (segment === 0 && block === 2) {
                this.fileNumber = data.get<number>(offset + FILE_NUMBER_INDEX);
            } else if (segment === 1 && block === 2) {
                this.nameOffset = data.get<number>(offset + NAME_OFFSET_INDEX);
            }
        }
    }

    readFileName(fileNameList: string) {
        const nameOffset = this.nameOffset!;
        // beginning in version 10.0.1 the nameOffset is not always aligned correctly for entries in eso.mnf
        let startIndex = nameOffset;
        const endIndex = fileNameList.indexOf('\0', nameOffset);
        while (startIndex > 0 && fileNameList[startIndex - 1] !== '\0') {
            startIndex--;
        }
        this.fileName = fileNameList.substring(startIndex, endIndex);
    }

    getFileNumber(): number {
        return this.fileNumber!;
    }
}
