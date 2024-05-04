import type FileTreeEntryData from './FileTreeEntryData';

export default interface FileTreeEntryDataProvider {
    get icon(): string;
    get label(): string;
    get path(): string;
    get hasChildren(): boolean;

    loadChildren(): Promise<FileTreeEntryData<FileTreeEntryDataProvider>[]>;
}
