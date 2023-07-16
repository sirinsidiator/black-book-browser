import { document } from 'ionicons/icons';
import type { FileBrowserEntryData } from './StateManager';
import type MnfEntry from './mnf/MnfEntry';

export class FileEntry implements FileBrowserEntryData {
    public readonly icon = document;
    public readonly children: FileBrowserEntryData[] = [];
    public open = false;

    constructor(
        public readonly mnfEntry: MnfEntry,
        public readonly parent: FileBrowserEntryData,
        public readonly label: string
    ) {}

    public select() {
        console.log('select file:', this.label, this);
        // this.stateManager.selectedContent.set(this);
    }
}
