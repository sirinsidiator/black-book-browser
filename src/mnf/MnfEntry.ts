import { FieldData } from "../util/BufferReader";
import ZOSFileTableEntry from "../zosft/ZOSFileTableEntry";

export default class MnfEntry {

    data: FieldData;
    fileName: string;
    tableEntry?: ZOSFileTableEntry;
    invalidOffset: boolean;
    invalidSize: boolean;

    constructor() {
        this.data = new FieldData();
    }

}
