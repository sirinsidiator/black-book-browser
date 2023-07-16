import { readPartialFile } from '../util/FileUtil.js';
import type MnfEntry from './MnfEntry.js';

export default class MnfArchiveFile {
    constructor(
        public readonly path: string,
        public readonly prefix: string,
        public readonly size: number
    ) {}

    async loadContent(entry: MnfEntry): Promise<Uint8Array> {
        console.log('loadContent', entry);
        const named = entry.data.named;
        const offset = named['offset'].value as number;
        const compressedSize = named['compressedSize'].value as number;
        return readPartialFile(this.path, offset, compressedSize);
    }
}
