import type FileSearchEntry from '$lib/FileSearchEntry';
import type {
    ExtractFilesProgress,
    ExtractFilesRequest,
    ExtractFilesResult
} from '$lib/mnf/MnfArchive';
import type { MnfFileData } from '$lib/mnf/MnfFileData';
import TauriHelper from '$lib/tauri/TauriHelper';
import {
    isBackgroundMessage,
    type BackgroundExtractFilesMessage,
    type BackgroundGetBaseNameMessage,
    type BackgroundGetDirNameMessage,
    type BackgroundGetFileMetaDataMessage,
    type BackgroundLoadFileContentMessage,
    type BackgroundMessage,
    type BackgroundReadMnfArchiveMessage,
    type BackgroundResolvePathMessage,
    type BackgroundSearchFilesMessage,
    type BackgroundWorkerInitMessage
} from './BackgroundMessage';
import BackgroundMessageTransceiver from './BackgroundMessageTransceiver';
import { BackgroundMessageType } from './BackgroundMessageType';
import workerUrl from './worker?worker&url';

export default class BackgroundService {
    private static instance: BackgroundService;

    public static getInstance(): BackgroundService {
        if (!this.instance) {
            this.instance = new BackgroundService();
        }
        return this.instance;
    }

    private backgroundWorker: Worker;
    private transceiver: BackgroundMessageTransceiver;
    private messageHandlers = new Map<
        BackgroundMessageType,
        (message: BackgroundMessage) => Promise<unknown>
    >();

    private constructor() {
        console.log('creating background worker...');
        this.backgroundWorker = new window.Worker(workerUrl, {
            type: 'module'
        });
        this.transceiver = new BackgroundMessageTransceiver(this.backgroundWorker);
        this.backgroundWorker.onmessage = this.handleMessage.bind(this);

        this.messageHandlers.set(BackgroundMessageType.GET_FILE_METADATA, async (message) => {
            const typedMessage = message as BackgroundGetFileMetaDataMessage;
            return TauriHelper.getInstance().getFileMetadata(typedMessage.filePath);
        });

        this.messageHandlers.set(BackgroundMessageType.GET_BASENAME, async (message) => {
            const typedMessage = message as BackgroundGetBaseNameMessage;
            return TauriHelper.getInstance().getBasename(typedMessage.path, typedMessage.ext);
        });

        this.messageHandlers.set(BackgroundMessageType.GET_DIRNAME, async (message) => {
            const typedMessage = message as BackgroundGetDirNameMessage;
            return TauriHelper.getInstance().getDirname(typedMessage.path);
        });

        this.messageHandlers.set(BackgroundMessageType.RESOLVE_PATH, async (message) => {
            const paths = (message as BackgroundResolvePathMessage).paths;
            return TauriHelper.getInstance().resolve(...paths);
        });

        this.initialize();
    }

    private handleMessage(event: MessageEvent<BackgroundMessage>) {
        if (isBackgroundMessage(event.data)) {
            const message = event.data;
            if (this.messageHandlers.has(message.type)) {
                this.messageHandlers.get(message.type)!(message).then(
                    (result) => {
                        this.transceiver.sendSuccessResponse(message, result);
                    },
                    (reason) => {
                        this.transceiver.sendErrorResponse(message, reason);
                    }
                );
            } else {
                this.transceiver.onMessage(message);
            }
        } else {
            console.warn('service received invalid message:', event.data);
        }
    }

    private initialize() {
        const helper = TauriHelper.getInstance();
        this.transceiver
            .sendMessage({
                type: BackgroundMessageType.INIT,
                config: {
                    readPartialFileUrl: helper.getReadPartialFileUrl(),
                    inflateUrl: helper.getInflateUrl(),
                    decompressUrl: helper.getDecompressUrl(),
                    extractUrl: helper.getExtractUrl()
                }
            } as BackgroundWorkerInitMessage)
            .catch((error) => {
                console.error('failed to initialize background worker:', error);
            });
    }

    public readMnfArchive(path: string, size: number): Promise<MnfFileData[]> {
        return this.transceiver.sendMessage({
            type: BackgroundMessageType.READ_MNF_ARCHIVE,
            archivePath: path,
            archiveSize: size
        } as BackgroundReadMnfArchiveMessage) as Promise<MnfFileData[]>;
    }

    public loadFileContent(file: MnfFileData): Promise<Uint8Array> {
        return this.transceiver.sendMessage({
            type: BackgroundMessageType.LOAD_FILE_CONTENT,
            file: file
        } as BackgroundLoadFileContentMessage) as Promise<Uint8Array>;
    }

    public extractFiles(
        extractionRequest: ExtractFilesRequest,
        onprogress: (progress: ExtractFilesProgress) => void
    ): Promise<ExtractFilesResult> {
        return this.transceiver.sendMessage(
            {
                type: BackgroundMessageType.EXTRACT_FILES,
                request: extractionRequest
            } as BackgroundExtractFilesMessage,
            onprogress as (progress: unknown) => void
        ) as Promise<ExtractFilesResult>;
    }

    public searchFiles(searchTerm: string): Promise<Fuzzysort.KeysResults<FileSearchEntry>> {
        return this.transceiver.sendMessage({
            type: BackgroundMessageType.SEARCH_FILES,
            searchTerm: searchTerm
        } as BackgroundSearchFilesMessage) as Promise<Fuzzysort.KeysResults<FileSearchEntry>>;
    }
}
