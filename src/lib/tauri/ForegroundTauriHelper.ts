import { convertFileSrc } from '@tauri-apps/api/core';
import { basename, desktopDir, dirname, resolve } from '@tauri-apps/api/path';
import { stat, type FileInfo } from '@tauri-apps/plugin-fs';
import BaseTauriHelper from './BaseTauriHelper';

export default class ForegroundTauriHelper extends BaseTauriHelper {
    public getInflateUrl() {
        return convertFileSrc('inflate', 'bbb');
    }

    public getReadPartialFileUrl() {
        return convertFileSrc('read-partial-file', 'bbb');
    }

    public getDecompressUrl() {
        return convertFileSrc('decompress', 'bbb');
    }

    public getExtractUrl() {
        return convertFileSrc('extract-files', 'bbb');
    }

    public getExtractProgressUrl() {
        return convertFileSrc('extract-files-progress', 'bbb');
    }

    public async getFileMetadata(path: string): Promise<FileInfo> {
        return stat(path);
    }

    public async getBasename(path: string, ext?: string): Promise<string> {
        return basename(path, ext);
    }

    public async getDirname(path: string): Promise<string> {
        return dirname(path);
    }

    public async resolve(...paths: string[]): Promise<string> {
        return resolve(...paths);
    }

    public async getExtractionTargetFolder(): Promise<string> {
        const folder = localStorage.getItem('extract-target-folder');
        if (!folder) {
            return desktopDir();
        }
        return folder;
    }

    public setExtractionTargetFolder(folder: string) {
        localStorage.setItem('extract-target-folder', folder);
    }
}
