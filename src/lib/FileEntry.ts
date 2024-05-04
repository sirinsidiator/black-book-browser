import hljs, { type HighlightResult } from 'highlight.js';
import { document } from 'ionicons/icons';
import type { FolderEntry } from './FolderEntry';
import type MnfArchiveEntry from './MnfArchiveEntry';
import DDSHelper from './frontend/DDSHelper';
import type FileTreeEntryData from './tree/FileTreeEntryData';
import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';
import BufferReader from './util/BufferReader';
import type { MnfFileData } from './mnf/MnfFileData';
import BackgroundService from './backend/BackgroundService';

abstract class FilePreview {}

export class ImageFilePreview implements FilePreview {
    constructor(public readonly canvas: HTMLCanvasElement) {
        console.log('ImageFilePreview', canvas);
    }

    public getDataUrl() {
        return this.canvas.toDataURL();
    }
}

export class TextFilePreview implements FilePreview {
    private result: HighlightResult;

    constructor(
        public readonly content: string,
        public readonly language: string
    ) {
        console.log('TextFilePreview', language);
        this.result = hljs.highlight(content, { language: language });
    }

    public getText() {
        return this.result.value;
    }
}

const EXT_TO_LANGUAGE: { [index: string]: string } = {
    '.lua': 'lua',
    '.txt': 'ini',
    '.xml': 'xml',
    '.hlsl': 'c++',
    '.fxh': 'c++',
    '.frag': 'c++',
    '.vert': 'c++',
    '.geom': 'c++',
    '.comp': 'c++'
};

export class FileEntry implements FileTreeEntryDataProvider {
    constructor(
        public readonly file: MnfFileData,
        private readonly parent: MnfArchiveEntry | FolderEntry,
        private readonly _label: string
    ) {}

    public get icon(): string {
        return document;
    }

    public get label(): string {
        return this._label;
    }

    public get path(): string {
        return this.parent.path + '/' + this._label;
    }

    public get hasChildren(): boolean {
        return false;
    }

    public loadChildren(): Promise<FileTreeEntryData<FileTreeEntryDataProvider>[]> {
        return Promise.resolve([]);
    }

    public get compressedSize() {
        return this.file.compressedSize;
    }

    public get decompressedSize() {
        return this.file.size;
    }

    public async toggleOpen() {
        /* noop */
    }

    public async getPreviewLoader(): Promise<FilePreview | null> {
        const extension = this.file.fileName.substr(this.file.fileName.lastIndexOf('.')) ?? '';
        if (extension === '.dds') {
            console.log('getPreviewLoader', this.file.fileName);

            const data = await BackgroundService.getInstance().loadFileContent(this.file);
            if (data) {
                const canvas = new DDSHelper().createCanvas(data);
                if (canvas) {
                    console.log('getPreviewLoader', canvas);
                    return new ImageFilePreview(canvas);
                }
            }
        } else if (EXT_TO_LANGUAGE[extension]) {
            console.log('getPreviewLoader', this.file.fileName);
            const data = await BackgroundService.getInstance().loadFileContent(this.file);
            if (data) {
                const view = new BufferReader(data);
                return new TextFilePreview(view.readString(), EXT_TO_LANGUAGE[extension]);
            }
        }
        return null;
    }

    public updateIndeterminate() {
        // do nothing
    }
}
