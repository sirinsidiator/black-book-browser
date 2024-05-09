import type FileSearchEntry from '$lib/FileSearchEntry';
import type MnfArchive from '$lib/mnf/MnfArchive';
import type { ExtractFilesProgress } from '$lib/mnf/MnfArchive';
import type { MnfFileData } from '$lib/mnf/MnfFileData';
import MnfReader from '$lib/mnf/MnfReader';
import type { FileInfo } from '@tauri-apps/plugin-fs';
import fuzzysort from 'fuzzysort';
import type {
    BackgroundExtractFilesMessage,
    BackgroundGetBaseNameMessage,
    BackgroundGetDirNameMessage,
    BackgroundGetFileMetaDataMessage,
    BackgroundLoadFileContentMessage,
    BackgroundMessage,
    BackgroundReadMnfArchiveMessage,
    BackgroundResolvePathMessage,
    BackgroundSearchFilesMessage,
    BackgroundWorkerInitMessage
} from './BackgroundMessage';
import BackgroundMessageTransceiver from './BackgroundMessageTransceiver';
import { BackgroundMessageType } from './BackgroundMessageType';
import type { BackgroundWorkerConfig } from './BackgroundWorkerConfig';

export default class BackgroundWorker {
    private static instance: BackgroundWorker;

    public static getInstance(): BackgroundWorker {
        if (!this.instance) {
            console.error('worker not initialized');
        }
        return this.instance;
    }

    public static initialize(message: BackgroundWorkerInitMessage) {
        if (this.instance) {
            console.warn('worker already initialized');
            return;
        }
        this.instance = new BackgroundWorker(message.config);
        this.instance.transceiver.sendSuccessResponse(message);
    }

    public static isWorker() {
        return this.instance instanceof BackgroundWorker;
    }

    private transceiver: BackgroundMessageTransceiver;
    private archives = new Map<string, MnfArchive>();

    private constructor(public readonly config: BackgroundWorkerConfig) {
        this.transceiver = new BackgroundMessageTransceiver({
            postMessage: (message) => postMessage(message)
        } as Worker);
    }

    public handleMessage(message: BackgroundMessage) {
        switch (message.type) {
            case BackgroundMessageType.INIT:
                this.transceiver.sendErrorResponse(message, 'worker already initialized');
                break;
            case BackgroundMessageType.READ_MNF_ARCHIVE:
                this.onReadMnfArchive(message);
                break;
            case BackgroundMessageType.LOAD_FILE_CONTENT:
                this.onLoadFileContent(message);
                break;
            case BackgroundMessageType.EXTRACT_FILES:
                this.onExtractFiles(message);
                break;
            case BackgroundMessageType.SEARCH_FILES:
                this.onSearchFiles(message);
                break;
            default:
                this.transceiver.onMessage(message);
        }
    }

    private onReadMnfArchive(message: BackgroundMessage) {
        this.readMnfArchive(message as BackgroundReadMnfArchiveMessage).then(
            (archive) => {
                this.transceiver.sendSuccessResponse(message, archive);
            },
            (reason) => {
                this.transceiver.sendErrorResponse(message, reason);
            }
        );
    }

    private async readMnfArchive(message: BackgroundReadMnfArchiveMessage): Promise<MnfFileData[]> {
        try {
            const path = message.archivePath;
            const size = message.archiveSize;
            console.log('Worker readMnfArchive', path);
            const reader = new MnfReader();
            const archive = await reader.read(path, size);
            this.archives.set(path, archive);
            console.log('Worker readMnfArchive:', archive);

            const fileList: MnfFileData[] = [];
            for (const [fileNumber, entry] of archive.mnfEntries) {
                fileList.push({
                    archivePath: path,
                    fileNumber,
                    fileName: entry.fileName ?? '<missing name>',
                    size: entry.data.named['fileSize'].value as number,
                    compressedSize: entry.data.named['compressedSize'].value as number
                });
            }
            fileList.sort((a, b) => a.fileName.localeCompare(b.fileName));
            return fileList;
        } catch (error) {
            console.warn('Failed to read archive:', error);
            throw error;
        }
    }

    private onLoadFileContent(message: BackgroundMessage) {
        this.loadFileContent(message as BackgroundLoadFileContentMessage).then(
            (archive) => {
                this.transceiver.sendSuccessResponse(message, archive);
            },
            (reason) => {
                this.transceiver.sendErrorResponse(message, reason);
            }
        );
    }

    private async loadFileContent(message: BackgroundLoadFileContentMessage): Promise<Uint8Array> {
        try {
            const file = message.file;
            console.log('Worker loadFileContent', file);
            const archive = this.archives.get(file.archivePath);
            if (!archive) {
                throw new Error('archive not found');
            }
            const mnfEntry = archive.mnfEntries.get(file.fileNumber);
            if (!mnfEntry) {
                throw new Error('file not found');
            }
            const content = await archive.getContent(mnfEntry);
            console.log('Worker loadFileContent:', content);
            return content;
        } catch (error) {
            console.warn('Failed to load file content:', error);
            throw error;
        }
    }

    private onExtractFiles(message: BackgroundMessage) {
        this.extractFiles(message as BackgroundExtractFilesMessage, (progress) =>
            this.transceiver.sendProgressResponse(message, progress)
        ).then(
            (result) => {
                this.transceiver.sendSuccessResponse(message, result);
            },
            (reason) => {
                this.transceiver.sendErrorResponse(message, reason);
            }
        );
    }

    private async extractFiles(
        message: BackgroundExtractFilesMessage,
        onprogress: (progress: ExtractFilesProgress) => void
    ) {
        try {
            const request = message.request;
            const archive = this.archives.get(request.archivePath);
            if (!archive) {
                throw new Error('archive not found');
            }
            return archive.extractFiles(request, onprogress);
        } catch (error) {
            console.warn('Failed to extract files:', error);
            throw error;
        }
    }

    private onSearchFiles(message: BackgroundMessage) {
        const data = message as BackgroundSearchFilesMessage;
        try {
            let searchEntries: FileSearchEntry[] = [];
            this.archives.forEach((archive) => {
                searchEntries = searchEntries.concat(archive.getSearchEntries());
            });

            const result = fuzzysort.go(data.searchTerm, searchEntries, {
                keys: ['data'],
                limit: 10000,
                threshold: -10000
            });
            this.transceiver.sendSuccessResponse(message, result);
        } catch (error) {
            console.warn('Failed to search files:', error);
            this.transceiver.sendErrorResponse(message, error);
        }
    }

    public async getFileMetadata(path: string): Promise<FileInfo> {
        return this.transceiver.sendMessage({
            type: BackgroundMessageType.GET_FILE_METADATA,
            filePath: path
        } as BackgroundGetFileMetaDataMessage) as Promise<FileInfo>;
    }

    public async getBasename(path: string, ext?: string): Promise<string> {
        return this.transceiver.sendMessage({
            type: BackgroundMessageType.GET_BASENAME,
            path,
            ext
        } as BackgroundGetBaseNameMessage) as Promise<string>;
    }

    public async getDirname(path: string): Promise<string> {
        return this.transceiver.sendMessage({
            type: BackgroundMessageType.GET_DIRNAME,
            path
        } as BackgroundGetDirNameMessage) as Promise<string>;
    }

    public async resolvePath(...paths: string[]): Promise<string> {
        return this.transceiver.sendMessage({
            type: BackgroundMessageType.RESOLVE_PATH,
            paths
        } as BackgroundResolvePathMessage) as Promise<string>;
    }
}
