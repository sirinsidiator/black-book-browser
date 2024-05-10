import type { ExtractFilesRequest } from '$lib/mnf/MnfArchive';
import type { MnfFileData } from '$lib/mnf/MnfFileData';
import { BackgroundMessageType } from './BackgroundMessageType';
import type { BackgroundWorkerConfig } from './BackgroundWorkerConfig';

export interface BackgroundMessage {
    id: number;
    type: BackgroundMessageType;
}

export interface BackgroundWorkerInitMessage extends BackgroundMessage {
    type: BackgroundMessageType.INIT;
    config: BackgroundWorkerConfig;
}

export interface BackgroundResponseMessage extends BackgroundMessage {
    type: BackgroundMessageType.RESPONSE;
    result: unknown;
    error?: boolean;
}

export interface BackgroundProgressMessage extends BackgroundMessage {
    type: BackgroundMessageType.PROGRESS;
    progress: unknown;
}

export interface BackgroundReadMnfArchiveMessage extends BackgroundMessage {
    type: BackgroundMessageType.READ_MNF_ARCHIVE;
    archivePath: string;
    archiveSize: number;
}

export interface BackgroundLoadFileContentMessage extends BackgroundMessage {
    type: BackgroundMessageType.LOAD_FILE_CONTENT;
    file: MnfFileData;
}

export interface BackgroundExtractFilesMessage extends BackgroundMessage {
    type: BackgroundMessageType.EXTRACT_FILES;
    request: ExtractFilesRequest;
}

export interface BackgroundGetFileMetaDataMessage extends BackgroundMessage {
    type: BackgroundMessageType.GET_FILE_METADATA;
    filePath: string;
}

export interface BackgroundGetBaseNameMessage extends BackgroundMessage {
    type: BackgroundMessageType.GET_BASENAME;
    path: string;
    ext?: string;
}

export interface BackgroundGetDirNameMessage extends BackgroundMessage {
    type: BackgroundMessageType.GET_DIRNAME;
    path: string;
}

export interface BackgroundResolvePathMessage extends BackgroundMessage {
    type: BackgroundMessageType.RESOLVE_PATH;
    paths: string[];
}

export interface BackgroundSearchFilesMessage extends BackgroundMessage {
    type: BackgroundMessageType.SEARCH_FILES;
    searchTerm: string;
}

export interface BackgroundGetFolderStatsMessage extends BackgroundMessage {
    type: BackgroundMessageType.GET_FOLDER_STATS;
    archive: string;
    path: string;
}

export function isBackgroundMessage(message: unknown): message is BackgroundMessage {
    if (typeof message !== 'object' || message === null) {
        return false;
    }
    if (typeof (message as BackgroundMessage).id !== 'number') {
        return false;
    }
    if (typeof (message as BackgroundMessage).type !== 'number') {
        return false;
    }
    return true;
}

export function isBackgroundResponseMessage(
    message: unknown
): message is BackgroundResponseMessage {
    if (!isBackgroundMessage(message)) {
        return false;
    }
    if (message.type !== BackgroundMessageType.RESPONSE) {
        return false;
    }
    return 'result' in message;
}

export function isBackgroundProgressMessage(
    message: unknown
): message is BackgroundProgressMessage {
    if (!isBackgroundMessage(message)) {
        return false;
    }
    if (message.type !== BackgroundMessageType.PROGRESS) {
        return false;
    }
    return 'progress' in message;
}
