import type { MnfFileData } from '$lib/mnf/MnfFileData';

export default interface FileTreeEntryDataProvider {
    get icon(): string;
    get label(): string;
    get path(): string;
    get hasChildren(): boolean;
    get mnfFiles(): MnfFileData[];

    loadChildren(): Promise<FileTreeEntryDataProvider[]>;
}
