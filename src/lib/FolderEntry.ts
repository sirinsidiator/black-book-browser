import { folder } from 'ionicons/icons';
import type { FileBrowserEntryData } from './StateManager';

export class FolderEntry implements FileBrowserEntryData {
    public readonly icon = folder;
    public readonly children: FileBrowserEntryData[] = [];
    public open = false;

    constructor(public readonly parent: FileBrowserEntryData, public readonly label: string) {}

    public select() {
        console.log('select folder:', this.label, this);
        // this.stateManager.selectedContent.set(this);
    }
}
