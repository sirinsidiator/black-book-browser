import { basename } from 'path';
import { getFileSize, readPartialFile } from '../util/FileUtil.js';
import type MnfEntry from './MnfEntry.js';

export default class MnfArchiveFile {

    path: string;
    prefix: string;
    size: number;

    constructor(path: string) {
        this.path = path;
        this.prefix = basename(path, '.dat');
        this.size = getFileSize(path);
    }

    async loadContent(entry: MnfEntry): Promise<Buffer> {
        const named = entry.data.named;
        const offset = named['offset'].value as number;
        const compressedSize = named['compressedSize'].value as number;
        return await readPartialFile(this.path, offset, compressedSize);
    }

}
