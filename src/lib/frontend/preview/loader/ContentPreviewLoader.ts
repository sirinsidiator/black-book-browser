import type ContentEntry from '$lib/ContentEntry';
import type { ComponentType, SvelteComponent } from 'svelte';
import NoPreview from '../NoPreview.svelte';

export abstract class ContentPreviewLoaderFactory {
    public abstract supports(content: ContentEntry): boolean;
    public abstract create(content: ContentEntry): ContentPreviewLoader;
}

export abstract class ContentPreviewLoader {
    private static loaders: ContentPreviewLoaderFactory[] = [];

    public static async load(content: ContentEntry): Promise<ContentPreviewLoader> {
        const loaderFactory = this.loaders.find((loader) => loader.supports(content));
        if (!loaderFactory) {
            return new NoPreviewLoader();
        }
        const loader = loaderFactory.create(content);
        await loader.prepare();
        return loader;
    }

    public static registerLoader(loader: ContentPreviewLoaderFactory) {
        this.loaders.push(loader);
    }

    public abstract readonly previewClass: ComponentType<SvelteComponent>;
    public abstract readonly canSave: boolean;

    public abstract prepare(): Promise<void>;
    public abstract save(): void;
}

class NoPreviewLoader extends ContentPreviewLoader {
    public readonly previewClass = NoPreview;
    public readonly canSave = false;

    public prepare() {
        return Promise.resolve();
    }

    public save() {
        // Do nothing
    }
}
