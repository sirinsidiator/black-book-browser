// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type FileSearchEntry from '$lib/FileSearchEntry';
import type { FolderStats } from '$lib/FolderEntry';
import type {
    ExtractFilesProgress,
    ExtractFilesRequest,
    ExtractFilesResult
} from '$lib/mnf/MnfArchive';
import type { MnfFileData } from '$lib/mnf/MnfFileData';
import {
    isBackgroundMessage,
    type BackgroundExtractFilesMessage,
    type BackgroundGetFolderStatsMessage,
    type BackgroundLoadFileContentMessage,
    type BackgroundMessage,
    type BackgroundReadMnfArchiveMessage,
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
        this.transceiver
            .sendMessage({
                type: BackgroundMessageType.INIT,
                config: {}
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

    public getFolderStats(archive: string, path: string): Promise<FolderStats> {
        return this.transceiver.sendMessage({
            type: BackgroundMessageType.GET_FOLDER_STATS,
            archive,
            path
        } as BackgroundGetFolderStatsMessage) as Promise<FolderStats>;
    }
}
