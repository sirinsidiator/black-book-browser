import { FieldData } from '../util/BufferReader';
import type ZOSFileTableEntry from '../zosft/ZOSFileTableEntry';
import type MnfArchive from './MnfArchive';

export default class MnfEntry {
    data: FieldData;
    fileName?: string;
    tableEntry?: ZOSFileTableEntry;
    invalidOffset?: boolean;
    invalidSize?: boolean;

    constructor(public readonly archive: MnfArchive) {
        this.data = new FieldData();
    }
}
