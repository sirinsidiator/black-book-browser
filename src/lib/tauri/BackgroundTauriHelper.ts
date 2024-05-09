import BackgroundWorker from '$lib/backend/BackgroundWorker';
import type { FileInfo } from '@tauri-apps/plugin-fs';
import BaseTauriHelper from './BaseTauriHelper';

export default class BackgroundTauriHelper extends BaseTauriHelper {
    public getInflateUrl() {
        return BackgroundWorker.getInstance().config.inflateUrl;
    }

    public getReadPartialFileUrl() {
        return BackgroundWorker.getInstance().config.readPartialFileUrl;
    }

    public getDecompressUrl() {
        return BackgroundWorker.getInstance().config.decompressUrl;
    }

    public getExtractUrl() {
        return BackgroundWorker.getInstance().config.extractUrl;
    }

    public getExtractProgressUrl() {
        return BackgroundWorker.getInstance().config.extractProgressUrl;
    }

    public async getFileMetadata(path: string): Promise<FileInfo> {
        return BackgroundWorker.getInstance().getFileMetadata(path);
    }

    public async getBasename(path: string, ext?: string): Promise<string> {
        return BackgroundWorker.getInstance().getBasename(path, ext);
    }

    public async getDirname(path: string): Promise<string> {
        return BackgroundWorker.getInstance().getDirname(path);
    }

    public async resolve(...paths: string[]): Promise<string> {
        return BackgroundWorker.getInstance().resolvePath(...paths);
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async getExtractionTargetFolder(): Promise<string> {
        const path = localStorage.getItem('extract-target-folder');
        if (!path) {
            console.warn('tried to get extraction target folder, but none was set');
            return '';
        }
        return path;
    }

    public setExtractionTargetFolder(folder: string) {
        console.warn('setExtractionTargetFolder not implemented in worker', folder);
    }
}
