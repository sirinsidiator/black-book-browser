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
    value?: void | number | number[] | Uint8Array | string;

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
    return '0x' + ('00'.repeat(c) + v.toString(16).toUpperCase()).substr(-2 * c);
}

export default class BufferReader {
    private cursor: number;
    private view: DataView;

    constructor(private data: Uint8Array) {
        this.view = new DataView(data.buffer);
        this.cursor = 0;
    }

    getSize() {
        return this.data.byteLength;
    }

    skip(length: number) {
        this.cursor += length;
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
                const size =
                    (definition.size as number) ??
                    (data.fields ? (data.fields[data.fields.length - 1]?.value as number) : 0);
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

    read(length: number): Uint8Array {
        const result = this.data.slice(this.cursor, this.cursor + length);
        this.cursor += length;
        return result;
    }

    readToEnd(): Uint8Array {
        const result = this.data.slice(this.cursor);
        this.cursor = this.data.byteLength;
        return result;
    }

    readString(length: number): string {
        const part = this.data.slice(this.cursor, this.cursor + length);
        this.cursor += length;
        return new TextDecoder().decode(part);
    }

    readUInt8(): number {
        const result = this.view.getUint8(this.cursor);
        this.cursor++;
        return result;
    }

    readUInt16(littleEndian = true): number {
        const result = this.view.getUint16(this.cursor, littleEndian);
        this.cursor += 2;
        return result;
    }

    readUInt32(littleEndian = true): number {
        const result = this.view.getUint32(this.cursor, littleEndian);
        this.cursor += 4;
        return result;
    }

    hasReachedEnd() {
        return this.cursor === this.data.byteLength;
    }
}
