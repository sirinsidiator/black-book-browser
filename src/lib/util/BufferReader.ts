// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

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
    size?: number;
    bigEndian?: boolean;
    condition?: (data: FieldData, offset: number) => boolean;
}

export class Field {
    definition: FieldDefinition;
    offset: number;
    value?: number | number[] | Uint8Array | string;

    constructor(definition: FieldDefinition, offset = 0) {
        this.definition = definition;
        this.offset = offset;
    }
}

export class FieldData {
    private readonly fields: Field[] = [];

    get length() {
        return this.fields.length;
    }

    add(field: Field) {
        this.fields.push(field);
    }

    get<T extends string | number | number[] | Uint8Array | undefined>(index: number): T {
        return this.fields[index]?.value as T;
    }

    set<T extends string | number | number[] | Uint8Array | undefined>(index: number, value: T) {
        this.fields[index].value = value;
    }
}

export function toHex(v: number, c = 0) {
    return '0x' + ('00'.repeat(c) + v.toString(16).toUpperCase()).slice(-2 * c);
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

    getRemainingSize() {
        return this.data.byteLength - this.cursor;
    }

    skip(length: number) {
        this.cursor += length;
    }

    setCursor(offset: number) {
        this.cursor = offset;
    }

    readFields(fieldDefinitions: FieldDefinition[], data: FieldData): number {
        const offset = data.length;
        for (const definition of fieldDefinitions) {
            const field = new Field(definition, this.cursor);
            if (!definition.condition || definition.condition(data, offset)) {
                try {
                    switch (definition.type) {
                        case FieldType.UINT8:
                            field.value = this.readUInt8();
                            break;
                        case FieldType.UINT16:
                            field.value = this.readUInt16(!definition.bigEndian);
                            break;
                        case FieldType.UINT16_ARRAY:
                            field.value = this.readArray(data, definition);
                            break;
                        case FieldType.UINT32:
                            field.value = this.readUInt32(!definition.bigEndian);
                            break;
                        case FieldType.BINARY:
                            field.value = this.read(this.getReadSize(data, definition));
                            break;
                        case FieldType.STRING:
                            field.value = this.readString(this.getReadSize(data, definition));
                            break;
                        default:
                            throw new Error(
                                'field type "' + (definition.type as string) + '" not implemented'
                            );
                    }
                } catch (e) {
                    console.error('Error reading field', field.definition.name, field, data, e);
                    throw e;
                }
            }
            data.add(field);
        }

        return offset;
    }

    private getReadSize(data: FieldData, definition: FieldDefinition): number {
        return definition.size ?? data.get<number | undefined>(data.length - 1) ?? 0;
    }

    private readArray(data: FieldData, definition: FieldDefinition): number[] {
        const values: number[] = [];
        const littleEndian = !definition.bigEndian;
        for (let j = 0; j < this.getReadSize(data, definition); ++j) {
            values.push(this.readUInt16(littleEndian));
        }
        return values;
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

    readString(length?: number): string {
        if (!length) {
            return new TextDecoder().decode(this.readToEnd());
        }
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

    readUint(byteLength: number, littleEndian = true): number {
        const data = this.read(byteLength);
        let result = 0;
        for (let i = 0; i < byteLength; ++i) {
            result += data[i] << (8 * (littleEndian ? i : byteLength - i - 1));
        }
        return result;
    }

    hasReachedEnd() {
        return this.cursor === this.data.byteLength;
    }
}
