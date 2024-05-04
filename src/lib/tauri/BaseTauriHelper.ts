import type { Metadata } from 'tauri-plugin-fs-extra-api';

export default abstract class BaseTauriHelper {
    public abstract getInflateUrl(): string;
    public abstract getReadPartialFileUrl(): string;
    public abstract getDecompressUrl(): string;
    public abstract getFileMetadata(path: string): Promise<Metadata>;
    public abstract getBasename(path: string, ext?: string): Promise<string>;
    public abstract getDirname(path: string): Promise<string>;
    public abstract resolve(...paths: string[]): Promise<string>;
}
