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
    value?: void | number | number[] | Buffer | string;

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

export function toHex(v: number, c = 0) {
    return '0x' + (
        '00'.repeat(c)
        + v.toString(16).toUpperCase()
    ).substr(-2 * c);
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
        for (const definition of fieldDefinitions) {
            if (definition.condition && !definition.condition(data, prefix)) {
                continue;
            }

            const littleEndian = !definition.bigEndian;
            const field = new Field(definition, this.cursor);
            try {
                const size = (definition.size || data.fields[data.fields.length - 1].value) as number;
                switch (definition.type) {
                    case FieldType.UINT8:
                        field.value = this.readUInt8();
                        break;
                    case FieldType.UINT16:
                        field.value = this.readUInt16(littleEndian);
                        break;
                    case FieldType.UINT16_ARRAY:
                        field.value = [];
                        for (let j = 0; j < size; ++j) {
                            field.value.push(this.readUInt16(littleEndian));
                        }
                        break;
                    case FieldType.UINT32:
                        field.value = this.readUInt32(littleEndian);
                        break;
                    case FieldType.BINARY:
                        field.value = this.read(size);
                        break;
                    case FieldType.STRING:
                        field.value = this.readString(size);
                        break;
                    default:
                        throw new Error('field type "' + definition.type + '" not implemented');
                }
            } catch (e) {
                console.error('Error reading field', field.definition.name, field, data, e);
                throw e;
            }
            data.add(field, prefix);
        }

        return data;
    }

    read(length: number): Buffer {
        const result = this.buffer.slice(this.cursor, this.cursor + length);
        this.cursor += length;
        return result;
    }

    readString(length: number): string {
        const result = this.buffer.toString('utf8', this.cursor, this.cursor + length);
        this.cursor += length;
        return result;
    }

    readUInt8(): number {
        const result = this.buffer.readUInt8(this.cursor);
        this.cursor++;
        return result;
    }

    readUInt16(littleEndian = true): number {
        const result = littleEndian ? this.buffer.readUInt16LE(this.cursor) : this.buffer.readUInt16BE(this.cursor);
        this.cursor += 2;
        return result;
    }

    readUInt32(littleEndian = true): number {
        const result = littleEndian ? this.buffer.readUInt32LE(this.cursor) : this.buffer.readUInt32BE(this.cursor);
        this.cursor += 4;
        return result;
    }

    hasReachedEnd() {
        return this.cursor === this.buffer.byteLength;
    }

}
