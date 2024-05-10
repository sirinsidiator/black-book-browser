import type FileSearchEntry from '$lib/FileSearchEntry';
import type MnfArchive from '$lib/mnf/MnfArchive';
import type { ExtractFilesProgress } from '$lib/mnf/MnfArchive';
import type { MnfFileData } from '$lib/mnf/MnfFileData';
import MnfReader from '$lib/mnf/MnfReader';
import fuzzysort from 'fuzzysort';
import type {
    BackgroundExtractFilesMessage,
    BackgroundGetFolderStatsMessage,
    BackgroundLoadFileContentMessage,
    BackgroundMessage,
    BackgroundReadMnfArchiveMessage,
    BackgroundSearchFilesMessage,
    BackgroundWorkerInitMessage
} from './BackgroundMessage';
import BackgroundMessageTransceiver from './BackgroundMessageTransceiver';
import { BackgroundMessageType } from './BackgroundMessageType';
import type { BackgroundWorkerConfig } from './BackgroundWorkerConfig';

// adapted from tauri core source so we can use invoke directly in the worker
function setupTauriInternals() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const window: any = {};

    function uid() {
        return crypto.getRandomValues(new Uint32Array(1))[0];
    }

    interface TauriIpcMessage {
        cmd: string;
        callback: number;
        error: number;
        payload: unknown;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options?: { headers?: any };
    }

    function processIpcMessage(message: unknown) {
        if (
            message instanceof ArrayBuffer ||
            ArrayBuffer.isView(message) ||
            Array.isArray(message)
        ) {
            return {
                contentType: 'application/octet-stream',
                data: message
            };
        } else {
            const data = JSON.stringify(message, (_k, val) => {
                if (val instanceof Map) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const o: any = {};
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                    val.forEach((v, k) => (o[k] = v));
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return o;
                } else if (
                    val instanceof Object &&
                    '__TAURI_CHANNEL_MARKER__' in val &&
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    typeof val.id === 'number'
                ) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    return `__CHANNEL__:${val.id}`;
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return val;
                }
            });

            return {
                contentType: 'application/json',
                data
            };
        }
    }

    function sendIpcMessage(message: TauriIpcMessage) {
        const { cmd, callback, error, payload, options } = message;

        const { contentType, data } = processIpcMessage(payload);
        fetch(__TAURI_INTERNALS__.convertFileSrc(cmd, 'ipc'), {
            method: 'POST',
            body: data as BodyInit,
            headers: {
                'Content-Type': contentType,
                'Tauri-Callback': callback,
                'Tauri-Error': error,
                ...(options?.headers || {})
            } as Record<string, string>
        })
            .then((response) => {
                const cb = response.ok ? callback : error;
                // we need to split here because on Android the content-type gets duplicated
                switch ((response.headers.get('content-type') ?? '').split(',')[0]) {
                    case 'application/json':
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        return response.json().then((r) => [cb, r]);
                    case 'text/plain':
                        return response.text().then((r) => [cb, r]);
                    default:
                        return response.arrayBuffer().then((r) => [cb, r]);
                }
            })
            .then(([cb, data]) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                if (window[`_${cb}`]) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                    window[`_${cb}`](data);
                } else {
                    console.warn(
                        `[TAURI] Couldn't find callback id {cb} in window. This might happen when the app is reloaded while Rust is running an asynchronous operation.`
                    );
                }
            })
            .catch((e) => {
                console.error('failed to send', e);
            });
    }

    function convertFileSrc(filePath: string, protocol = 'asset') {
        const path = encodeURIComponent(filePath);
        return `http://${protocol}.localhost/${path}`;
    }

    function transformCallback(callback: (result: unknown) => void, once: boolean) {
        const identifier = uid();
        const prop = `_${identifier}`;

        Object.defineProperty(window, prop, {
            value: (result: unknown) => {
                if (once) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                    Reflect.deleteProperty(window, prop);
                }

                return callback && callback(result);
            },
            writable: false,
            configurable: true
        });

        return identifier;
    }

    function invoke(cmd: string, payload: unknown, options: { headers?: Record<string, string> }) {
        return new Promise(function (resolve, reject) {
            const callback = __TAURI_INTERNALS__.transformCallback(function (r) {
                resolve(r);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                delete window[`_${error}`];
            }, true);
            const error = __TAURI_INTERNALS__.transformCallback(function (e) {
                reject(e as Error);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                delete window[`_${callback}`];
            }, true);

            sendIpcMessage({
                cmd,
                callback,
                error,
                payload: payload || {},
                options
            });
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    const __TAURI_INTERNALS__ = {
        postMessage: sendIpcMessage,
        convertFileSrc,
        transformCallback,
        ipc: sendIpcMessage,
        invoke
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    window.__TAURI_INTERNALS__ = __TAURI_INTERNALS__;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (globalThis as any).window = window;
}

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
        setupTauriInternals();
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
            case BackgroundMessageType.GET_FOLDER_STATS:
                this.onFolderStats(message);
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
            const start = performance.now();
            const reader = new MnfReader();
            const archive = await reader.read(path, size);
            this.archives.set(path, archive);
            const scanned = performance.now();
            console.log('mnf archive read in', scanned - start, 'ms', archive);

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
            console.log('file list created and sorted in', performance.now() - scanned, 'ms');
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

    private onFolderStats(message: BackgroundMessage) {
        const data = message as BackgroundGetFolderStatsMessage;
        try {
            const archive = this.archives.get(data.archive);
            if (!archive) {
                throw new Error('archive not found');
            }
            const stats = archive.getFolderStats(data.path);
            this.transceiver.sendSuccessResponse(message, stats);
        } catch (error) {
            console.warn('Failed to get folder stats:', error);
            this.transceiver.sendErrorResponse(message, error);
        }
    }
}
