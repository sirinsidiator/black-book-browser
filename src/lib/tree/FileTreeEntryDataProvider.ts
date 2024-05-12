import type { ContentEntry } from '$lib/StateManager';
import type { MnfFileData } from '$lib/mnf/MnfFileData';

export default interface FileTreeEntryDataProvider extends ContentEntry {
    get icon(): string;
    get label(): string;
    get path(): string;
    get hasChildren(): boolean;
    get mnfFiles(): MnfFileData[];

    loadChildren(): Promise<FileTreeEntryDataProvider[]>;
}
