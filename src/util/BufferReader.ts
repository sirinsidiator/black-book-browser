export enum FieldType {
    UINT8,
    UINT16,
    UINT16_ARRAY,
    UINT32,
    BINARY,
    STRING
}

export interface FieldDefinition {
    type: FieldType;
    name?: string;
    size?: number | string;
    bigEndian?: boolean;
    condition?: (data: FieldData, prefix?: string) => boolean;
}

export class Field {
    definition: FieldDefinition;
    offset: number;
    name?: string;
    value: void | number | number[] | Buffer | string;

    constructor(definition: FieldDefinition, offset = 0) {
        this.definition = definition;
        this.offset = offset;
    }
}

export class FieldData {

    named: {
        [index: string]: Field;
    };
    fields: Field[];

    constructor() {
        this.named = {};
        this.fields = [];
    }

    add(field: Field, prefix = '') {
        this.fields.push(field);
        if (field.definition.name) {
            field.name = prefix + field.definition.name;
            this.named[field.name] = field;
        }
    }

}

export default class BufferReader {

    buffer: Buffer;
    cursor: number;

    constructor(buffer: Buffer) {
        this.buffer = buffer;
        this.cursor = 0;
    }

    readFields(fieldDefinitions: FieldDefinition[], data?: FieldData, prefix?: string): FieldData {
        data = data || new FieldData();
        for (let i = 0; i < fieldDefinitions.length; ++i) {
            let definition = fieldDefinitions[i];
            if (definition.condition && !definition.condition(data, prefix)) {
                continue;
            }

            let littleEndian = !definition.bigEndian;
            let field = new Field(definition, this.cursor);
            switch (definition.type) {
                case FieldType.UINT8:
                    field.value = this.readUInt8();
                    break;
                case FieldType.UINT16:
                    field.value = this.readUInt16(littleEndian);
                    break;
                case FieldType.UINT16_ARRAY:
                    let values: number[] = field.value = [];
                    let count = (definition.size || data.fields[data.fields.length - 1].value) as number;
                    for (let j = 0; j < count; ++j) {
                        values.push(this.readUInt16(littleEndian));
                    }
                    break;
                case FieldType.UINT32:
                    field.value = this.readUInt32(littleEndian);
                    break;
                case FieldType.BINARY:
                    let size = (definition.size || data.fields[data.fields.length - 1].value) as number;
                    field.value = this.read(size);
                    break;
                case FieldType.STRING:
                    let length = (definition.size || data.fields[data.fields.length - 1].value) as number;
                    field.value = this.readString(length);
                    break;
                default:
                    console.warn('field type "' + definition.type + '" not implemented');
                    break;
            }
            data.add(field, prefix);
        }

        return data;
    }

    read(length: number): Buffer {
        let result = this.buffer.slice(this.cursor, this.cursor + length);
        this.cursor += length;
        return result;
    }

    readString(length: number): string {
        let result = this.buffer.toString('utf8', this.cursor, this.cursor + length);
        this.cursor += length;
        return result;
    }

    readUInt8(): number {
        let result = this.buffer.readUInt8(this.cursor);
        this.cursor++;
        return result;
    }

    readUInt16(littleEndian = true): number {
        let result = littleEndian ? this.buffer.readUInt16LE(this.cursor) : this.buffer.readUInt16BE(this.cursor);
        this.cursor += 2;
        return result;
    }

    readUInt32(littleEndian = true): number {
        let result = littleEndian ? this.buffer.readUInt32LE(this.cursor) : this.buffer.readUInt32BE(this.cursor);
        this.cursor += 4;
        return result;
    }

    hasReachedEnd() {
        return this.cursor === this.buffer.byteLength;
    }

}
