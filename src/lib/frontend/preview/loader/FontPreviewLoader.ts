import type ContentEntry from '$lib/ContentEntry';
import { FileEntry } from '$lib/FileEntry';
import BackgroundService from '$lib/backend/BackgroundService';
import FontFilePreview from '../FontFilePreview.svelte';
import { ContentPreviewLoader, ContentPreviewLoaderFactory } from './ContentPreviewLoader';

export default class FontPreviewLoader implements ContentPreviewLoader {
    public readonly previewClass = FontFilePreview;
    public readonly canSave = true;
    private data?: Uint8Array;
    private fontFace?: FontFace;

    constructor(public readonly file: FileEntry) {}

    public async prepare(): Promise<void> {
        const fileData = this.file.file;
        this.data = await BackgroundService.getInstance().loadFileContent(fileData);
        const fontFace = new FontFace('FontPreview', this.data);
        this.fontFace = await fontFace.load();
        document.fonts.clear();
        document.fonts.add(this.fontFace);
    }

    public save(): void {
        const a = document.createElement('a');
        const type = this.file.label.endsWith('.ttf') ? 'font/ttf' : 'font/otf';
        const file = new Blob([this.data!], { type });
        a.href = URL.createObjectURL(file);
        a.download = this.file.label;
        a.click();
        URL.revokeObjectURL(a.href);
    }
}

class FontPreviewLoaderFactory extends ContentPreviewLoaderFactory {
    public supports(content: ContentEntry) {
        return (
            content instanceof FileEntry &&
            (content.label.endsWith('.ttf') || content.label.endsWith('.otf'))
        );
    }

    public create(content: ContentEntry) {
        return new FontPreviewLoader(content as FileEntry);
    }
}
ContentPreviewLoader.registerLoader(new FontPreviewLoaderFactory());
