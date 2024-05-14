import type ContentEntry from '$lib/ContentEntry';
import { FileEntry } from '$lib/FileEntry';
import BackgroundService from '$lib/backend/BackgroundService';
import BufferReader from '$lib/util/BufferReader';
import hljs, { type HighlightResult } from 'highlight.js';
import TextFilePreview from '../TextFilePreview.svelte';
import { ContentPreviewLoader, ContentPreviewLoaderFactory } from './ContentPreviewLoader';

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

export default class TextFilePreviewLoader implements ContentPreviewLoader {
    public readonly previewClass = TextFilePreview;
    public readonly canSave = true;
    private result?: HighlightResult;
    private content?: string;

    constructor(
        public readonly file: FileEntry,
        public readonly language: string
    ) {}

    public async prepare(): Promise<void> {
        const fileData = this.file.file;
        const data = await BackgroundService.getInstance().loadFileContent(fileData);
        const view = new BufferReader(data);
        this.content = view.readString();
        this.result = hljs.highlight(this.content, { language: this.language });
    }

    public getText() {
        return this.result!.value;
    }

    public save(): void {
        const file = new Blob([this.content!], { type: 'text/plain' });
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.file.label;
        a.click();
        URL.revokeObjectURL(url);
    }
}

class TextFilePreviewLoaderFactory extends ContentPreviewLoaderFactory {
    public supports(content: ContentEntry) {
        return content instanceof FileEntry && this.getLanguage(content.label) !== undefined;
    }

    public create(content: ContentEntry) {
        return new TextFilePreviewLoader(content as FileEntry, this.getLanguage(content.label));
    }

    private getLanguage(fileName: string) {
        const extension = fileName.slice(fileName.lastIndexOf('.'));
        return EXT_TO_LANGUAGE[extension];
    }
}
ContentPreviewLoader.registerLoader(new TextFilePreviewLoaderFactory());
