import hljs, { type HighlightResult } from 'highlight.js';
import { document } from 'ionicons/icons';
import type { FolderEntry } from './FolderEntry';
import type { ContentEntry } from './StateManager';
import BackgroundService from './backend/BackgroundService';
import DDSHelper from './frontend/DDSHelper';
import type { MnfFileData } from './mnf/MnfFileData';
import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';
import BufferReader from './util/BufferReader';

abstract class FilePreview {
    public abstract prepare(): Promise<WeakRef<FilePreview>>;
}

export class ImageFilePreview implements FilePreview {
    private dataUrl?: string;
    private png: boolean;

    constructor(
        public readonly data: Uint8Array,
        extension: string
    ) {
        console.log('ImageFilePreview', data);
        this.png = extension === '.png';
    }

    public async prepare(): Promise<WeakRef<FilePreview>> {
        if (this.png) {
            await this.preparePng();
        } else {
            const canvas = new DDSHelper().createCanvas(this.data);
            this.dataUrl = canvas.toDataURL();
        }
        return new WeakRef(this);
    }

    public async preparePng(): Promise<WeakRef<FilePreview>> {
        const view = new BufferReader(this.data);
        view.skip(1);
        const header = view.readString(3);
        if (header !== 'PNG') {
            console.warn('Invalid PNG header', header);
            throw new Error('Invalid PNG data');
        }

        const blob = new Blob([this.data], { type: 'image/png' });

        this.dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Could not get data url from raw data'));
                }
            };
            reader.onerror = (error) => {
                reject(error);
            };
            reader.readAsDataURL(blob);
        });

        return new WeakRef(this);
    }

    public getDataUrl() {
        return this.dataUrl!;
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

    public prepare(): Promise<WeakRef<FilePreview>> {
        return Promise.resolve(new WeakRef(this));
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

export class FileEntry implements FileTreeEntryDataProvider, ContentEntry {
    public readonly icon = document;
    public readonly path: string;
    public readonly hasChildren = false;

    constructor(
        public readonly file: MnfFileData,
        public readonly parent: FolderEntry,
        public readonly label: string
    ) {
        this.path = parent.path + label;
    }

    public get compressedSize() {
        return this.file.compressedSize;
    }

    public get decompressedSize() {
        return this.file.size;
    }

    public get mnfFiles() {
        return [this.file];
    }

    public loadChildren(): Promise<FileTreeEntryDataProvider[]> {
        return Promise.resolve([]);
    }

    private previewCache: WeakRef<FilePreview> | null = null;
    public async getPreviewLoader(): Promise<FilePreview | null> {
        let preview = this.previewCache?.deref();
        if (!preview) {
            const extension = this.file.fileName.slice(this.file.fileName.lastIndexOf('.'));
            if (extension === '.dds' || extension === '.png') {
                const data = await BackgroundService.getInstance().loadFileContent(this.file);
                if (data) {
                    preview = new ImageFilePreview(data, extension);
                    this.previewCache = await preview.prepare();
                }
            } else if (EXT_TO_LANGUAGE[extension]) {
                const data = await BackgroundService.getInstance().loadFileContent(this.file);
                if (data) {
                    const view = new BufferReader(data);
                    preview = new TextFilePreview(view.readString(), EXT_TO_LANGUAGE[extension]);
                    this.previewCache = new WeakRef(preview);
                }
            }
        }
        return preview ?? null;
    }
}
