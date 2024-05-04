import BackgroundWorker from '$lib/backend/BackgroundWorker';
import type { Metadata } from 'tauri-plugin-fs-extra-api';
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

    public async getFileMetadata(path: string): Promise<Metadata> {
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
}
