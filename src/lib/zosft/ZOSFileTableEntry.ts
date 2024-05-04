import type MnfEntry from '../mnf/MnfEntry.js';
import BufferReader, {
    FieldData,
    FieldType,
    Field,
    type FieldDefinition
} from '../util/BufferReader.js';

const ENTRY_FIELD_DEFINITION_INDEX: FieldDefinition = { type: FieldType.UINT32, name: 'index' };
const BLOCK1_FIELD_DEFINITION_ID: FieldDefinition = { type: FieldType.UINT32, name: 'id' };
const BLOCK1_FIELD_DEFINITION_TYPE: FieldDefinition = { type: FieldType.UINT8, name: 'type' };
const BLOCK1_FIELD_DEFINITION_ROW_COUNT: FieldDefinition = { type: FieldType.UINT8, name: 'rows' };

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

    constructor(index: number) {
        this.data = new FieldData();

        const indexField = new Field(ENTRY_FIELD_DEFINITION_INDEX, -1);
        indexField.value = index;
        this.data.add(indexField);
    }

    readBlock(segment: number, block: number, reader: BufferReader) {
        const definitions = ENTRY_BLOCK_DEFINITIONS[segment][block];
        reader.readFields(definitions, this.data, 'segment' + segment + 'block' + block);
    }

    readBlock0(segment: number, reader: BufferReader): number {
        const prefix = 'segment' + segment + 'block0';

        const rowCountField = new Field(BLOCK1_FIELD_DEFINITION_ROW_COUNT, -1);
        rowCountField.value = 0;
        this.data.add(rowCountField, prefix);

        const idField = new Field(BLOCK1_FIELD_DEFINITION_ID);
        idField.value = 0;
        this.data.add(idField, prefix);

        const typeField = new Field(BLOCK1_FIELD_DEFINITION_TYPE, 3);
        typeField.value = 0;
        this.data.add(typeField, prefix);

        do {
            // need to skip empty rows
            if (!reader.hasReachedEnd()) {
                rowCountField.value++;
                const value = reader.readUInt32();
                idField.value = value & 0xffffff;
                typeField.value = value >>> 24;
                if (
                    !KNOWN_BLOCK1_VALUES[typeField.value] ||
                    (typeField.value !== 0x80 && idField.value > 0)
                ) {
                    console.warn('Unexpected value in', prefix, this);
                }
            } else {
                // eso.mnf doesn't seem to have enough entrys that are not 0
                idField.value = -1;
                typeField.value = -1;
                break;
            }
        } while (typeField.value === 0);
        return rowCountField.value;
    }

    readFileName(fileNameList: string) {
        const nameOffset = this.data.named['segment1block2nameOffset'].value as number;
        // beginning in version 10.0.1 the nameOffset is not always aligned correctly for entries in eso.mnf
        let startIndex = nameOffset;
        const endIndex = fileNameList.indexOf('\0', nameOffset);
        while (startIndex > 0 && fileNameList[startIndex - 1] !== '\0') {
            startIndex--;
        }
        this.fileName = fileNameList.substring(startIndex, endIndex);
    }

    getFileNumber(): number {
        return this.data.named['segment0block2fileNumber'].value as number;
    }
}
