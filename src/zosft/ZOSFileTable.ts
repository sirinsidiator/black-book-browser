import { FieldData } from '../util/BufferReader.js';
import ZOSFileTableEntry from './ZOSFileTableEntry.js';

export default class ZOSFileTable {

    data: FieldData;
    entries: ZOSFileTableEntry[];

    constructor(data: FieldData) {
        this.data = data;
        this.entries = [];
        for (let i = 0; i < data.named['entryCount'].value; ++i) {
            this.entries.push(new ZOSFileTableEntry(i));
        }
    }

    get(index: number): ZOSFileTableEntry {
        return this.entries[index];
    }

    forEach(callbackfn: (value: ZOSFileTableEntry, index: number, array: ZOSFileTableEntry[]) => void) {
        this.entries.forEach(callbackfn);
    }

}
