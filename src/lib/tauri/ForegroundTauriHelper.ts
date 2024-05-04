import { convertFileSrc } from '@tauri-apps/api/tauri';
import { metadata, type Metadata } from 'tauri-plugin-fs-extra-api';
import BaseTauriHelper from './BaseTauriHelper';

export default class ForegroundTauriHelper extends BaseTauriHelper {
    public getInflateUrl() {
        return convertFileSrc('', 'inflate');
    }

    public getReadPartialFileUrl() {
        return convertFileSrc('', 'read-partial-file');
    }

    public getDecompressUrl() {
        return convertFileSrc('', 'decompress');
    }

    public async getFileMetadata(path: string): Promise<Metadata> {
        return metadata(path);
    }

    private async getTauriPathModule() {
        // https://github.com/tauri-apps/tauri/issues/5518
        return import('@tauri-apps/api/path');
    }

    public async getBasename(path: string, ext?: string): Promise<string> {
        const tauriPath = await this.getTauriPathModule();
        return tauriPath.basename(path, ext);
    }

    public async getDirname(path: string): Promise<string> {
        const tauriPath = await this.getTauriPathModule();
        return tauriPath.dirname(path);
    }

    public async resolve(...paths: string[]): Promise<string> {
        const tauriPath = await this.getTauriPathModule();
        return tauriPath.resolve(...paths);
    }
}
