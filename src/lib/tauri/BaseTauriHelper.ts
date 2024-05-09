import type { FileInfo } from '@tauri-apps/plugin-fs';

export default abstract class BaseTauriHelper {
    public abstract getInflateUrl(): string;
    public abstract getReadPartialFileUrl(): string;
    public abstract getDecompressUrl(): string;
    public abstract getExtractUrl(): string;
    public abstract getFileMetadata(path: string): Promise<FileInfo>;
    public abstract getBasename(path: string, ext?: string): Promise<string>;
    public abstract getDirname(path: string): Promise<string>;
    public abstract resolve(...paths: string[]): Promise<string>;
    public abstract getExtractionTargetFolder(): Promise<string>;
    public abstract setExtractionTargetFolder(folder: string): void;
}
