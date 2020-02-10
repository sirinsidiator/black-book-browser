import { cpus } from "os";
import { basename, dirname } from "path";
import MnfArchive from "../mnf/MnfArchive";
import MnfEntry from "../mnf/MnfEntry";
import { formatFileSize, getFreeDiskSpace } from "../util/FileUtil";
import FileTree, { byTypeAndName } from "./FileTree";

const STORAGE_KEY_TARGET = 'extract.target';
const STORAGE_KEY_PRESERVE = 'extract.preserve';
const STORAGE_KEY_DECOMPRESS = 'extract.decompress';

const TREE_OPTIONS = {
    plugins: [
        'types',
        'sort',
        'checkbox'
    ],
    checkbox: {
        tie_selection: false
    },
    types: {
        file: {
            icon: 'jstree-file',
        }
    },
    sort: byTypeAndName,
    core: {
        themes: { name: 'default-dark' },
        data: (node: JSTreeNode, cb: JSTreeChildrenCallback) => { }
    },
};

enum ErrorType {
    OK,
    NO_FILES_SELECTED,
    NOT_ENOUGH_DISK_SPACE,
    INVALID_TARGET_DIRECTORY,
}

const ERROR_LIST = [
    ErrorType.INVALID_TARGET_DIRECTORY,
    ErrorType.NO_FILES_SELECTED,
    ErrorType.NOT_ENOUGH_DISK_SPACE,
]

type ErrorMessageFactory = (dialog: ExtractDialog) => string;
const ERROR_MESSAGE: Map<ErrorType, ErrorMessageFactory> = new Map();
ERROR_MESSAGE.set(ErrorType.NO_FILES_SELECTED, (dialog: ExtractDialog) => 'No files selected for extraction');
ERROR_MESSAGE.set(ErrorType.NOT_ENOUGH_DISK_SPACE, (dialog: ExtractDialog) => 'Disk full - need ' + formatFileSize(dialog.diskSpaceDelta, false) + ' more free space');
ERROR_MESSAGE.set(ErrorType.INVALID_TARGET_DIRECTORY, (dialog: ExtractDialog) => 'Invalid target folder');

const MAX_CONCURRENT = Math.max(1, cpus().length);
console.log('MAX_CONCURRENCY:', MAX_CONCURRENT);

class ExtractionHelper {
    dialog: ExtractDialog;

    archive: MnfArchive;
    folder: string;
    selection: MnfEntry[];

    total: number;
    processed: number;
    pending: number;
    failures: number;
    isCancelled: boolean;
    targetFolder: string;
    root: string;
    decompress: boolean;
    startTime: number;
    logText: string;

    constructor(dialog: ExtractDialog) {
        this.dialog = dialog;
    }

    start(archive: MnfArchive, folder: string, selection: MnfEntry[]) {
        if (this.archive) {
            console.warn('Extraction is already in progress', this.archive, this.folder);
            return;
        }

        this.archive = archive;
        this.folder = folder;
        this.selection = selection;

        this.total = selection.length;
        this.processed = 0;
        this.failures = 0;
        this.pending = 0;
        this.isCancelled = false;
        this.targetFolder = this.dialog.getTargetFolder();
        this.root = this.dialog.shouldPreserveRoot() ? '' : folder;
        this.decompress = this.dialog.shouldDecompress();

        this.startTime = Date.now();
        this.logText = 'Begin extracting "' + folder + '" to "' + this.targetFolder + '"\n';
        this.dialog.setLog(this.logText);

        if (selection.length > 0) {
            for (let i = 0; i < MAX_CONCURRENT && selection.length > 0; ++i) {
                this.queueNext();
            }
        } else {
            this.checkFinishedOrProceed();
        }
    }

    queueNext() {
        let entry = this.selection.shift();
        if (!entry) {
            this.checkFinishedOrProceed();
            return;
        }
        this.pending++;
        this.archive.extractFile(entry, this.targetFolder, this.root, this.decompress).then(() => {
            this.pending--;
            this.processed++;
            this.dialog.setProgress(this.processed, this.total);
            this.dialog.setStatus(entry.fileName);
            this.checkFinishedOrProceed();
        }, (err) => {
            console.warn('could not extract', entry, err);
            this.pending--;
            this.processed++;
            this.failures++;
            this.logText += 'Failed to extract ' + entry.fileName + '\n';
            this.dialog.setProgress(this.processed, this.total);
            this.dialog.setStatus(entry.fileName);
            this.dialog.setLog(this.logText);
            this.checkFinishedOrProceed();
        });
    }

    checkFinishedOrProceed() {
        if (this.processed === this.total || this.isCancelled) {
            if (this.pending > 0) {
                this.logText += this.pending + ' action' + (this.pending > 1 ? 's' : '') + ' pending...\n';
                this.dialog.setLog(this.logText);
            } else {
                let duration = ((Date.now() - this.startTime) / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 's';
                let fileCount = (this.processed - this.failures).toLocaleString() + ' of ' + this.total.toLocaleString() + ' files';
                if (this.isCancelled) {
                    this.logText += 'Stopped extracting after ' + duration + ' (' + fileCount + ' processed)';
                } else {
                    this.logText += 'Finished extracting ' + fileCount + ' in ' + duration + '\n';
                }
                this.dialog.setLog(this.logText);
                this.dialog.setStatus('');
                this.dialog.finishExtraction();
            }
        } else if (this.selection.length > 0) {
            this.queueNext();
        }
    }

    stop() {
        this.isCancelled = true;
        this.logText += 'Requested stopping extraction... (' + this.pending + ' actions pending)\n';
        this.dialog.setLog(this.logText);
        this.checkFinishedOrProceed();
    }

    clear() {
        this.archive = null;
        this.folder = null;
        this.selection = null;

        this.total = 0;
        this.processed = 0;
        this.failures = 0;
        this.pending = 0;
        this.isCancelled = false;
        this.targetFolder = null;
        this.root = null;
        this.decompress = false;

        this.startTime = 0;
        this.logText = '';
    }

}

export default class ExtractDialog {

    extractButton: JQueryUI.DialogButtonOptions[];
    cancelButton: JQueryUI.DialogButtonOptions[];
    closeButton: JQueryUI.DialogButtonOptions[];

    dialog: JQuery<HTMLElement>;
    dialogCloseButton: JQuery<HTMLElement>;
    buttonPane: JQuery<HTMLElement>;
    errorMessage: JQuery<HTMLElement>;

    page1: JQuery<HTMLElement>;
    options: JQuery<HTMLElement>;
    extractTarget: JQuery<HTMLElement>;
    extractTargetSource: JQuery<HTMLElement>;
    preserveParentsCheckbox: JQuery<HTMLElement>;
    decompressCheckbox: JQuery<HTMLElement>;
    filetree: JQuery<HTMLElement>;
    stats: JQuery<HTMLElement>;

    page2: JQuery<HTMLElement>;
    progressBar: JQuery<HTMLElement>;
    progressLabel: JQuery<HTMLElement>;
    progressLog: JQuery<HTMLElement>;
    statusText: JQuery<HTMLElement>;

    extraction: ExtractionHelper;
    diskSpaceDelta: number;
    isReady: boolean;
    isFile: boolean;
    errorState: Set<ErrorType> = new Set();
    currentArchive: MnfArchive;
    currentFolder: string;

    constructor($container: JQuery<HTMLElement>, leftSideFileTree: FileTree) {
        this.extractButton = [{
            text: 'Extract',
            click: () => this.beginExtraction()
        }];
        this.cancelButton = [{
            text: 'Cancel',
            click: () => this.cancelExtraction()
        }];
        this.closeButton = [{
            text: 'Close',
            click: () => this.close()
        }];

        this.page1 = $container.find('.page1');
        this.page2 = $container.find('.page2');
        this.options = this.page1.find('.options');

        (this.options as any).controlgroup({
            direction: 'vertical'
        });

        this.extractTarget = this.options.find('#extractTarget')
            .click(() => {
                this.extractTargetSource.click();
            });
        this.extractTargetSource = this.options.find('#extractTargetSource')
            .on('change', () => {
                let target = this.extractTargetSource.val() as string;
                if (target) {
                    this.extractTarget.val(target);
                    localStorage.setItem(STORAGE_KEY_TARGET, target);
                }
                this.setError(ErrorType.INVALID_TARGET_DIRECTORY, !target || target.length === 0);
            });
        this.options.find('#selectExtractTarget').button()
            .click(() => {
                this.extractTargetSource.click();
            });

        this.preserveParentsCheckbox = this.options.find('#extractPreserve');
        let preserveParentsCheckbox = (this.preserveParentsCheckbox as any).checkboxradio('option', 'icon', false)
            .on('change', () => {
                let value = this.shouldPreserveRoot();
                preserveParentsCheckbox.checkboxradio('option', 'label', value ? 'On' : 'Off');
                this.filetree.jstree('refresh');
                localStorage.setItem(STORAGE_KEY_PRESERVE, JSON.stringify(value));
            });

        this.decompressCheckbox = this.options.find('#extractDecompressed');
        let decompressCheckbox = (this.decompressCheckbox as any).checkboxradio('option', 'icon', false)
            .on('change', () => {
                let value = this.shouldDecompress();
                decompressCheckbox.checkboxradio('option', 'label', value ? 'On' : 'Off');
                this.updateStats();
                localStorage.setItem(STORAGE_KEY_DECOMPRESS, JSON.stringify(value));
            });

        this.errorMessage = $('<div class="error"></div>');
        this.stats = this.page1.find('.stats');

        TREE_OPTIONS.core.data = (node: JSTreeNode, cb: JSTreeChildrenCallback) => {
            if (this.getTreeData) {
                cb(this.getTreeData(node));
            } else {
                cb([]);
            }
        };

        let pending = false;
        let requestRefreshSelectionStats = () => {
            if (!pending && this.isReady) {
                pending = true;
                setTimeout(() => {
                    pending = false;
                    this.updateStats();
                }, 0);
            }
        }

        let filetree = this.filetree = this.page1.find('.filetree');
        filetree.jstree(TREE_OPTIONS)
            .on('check_node.jstree', requestRefreshSelectionStats)
            .on('uncheck_node.jstree', requestRefreshSelectionStats)
            .on('check_all.jstree', requestRefreshSelectionStats)
            .on('uncheck_all.jstree', requestRefreshSelectionStats)
            .on('refresh.jstree', () => {
                requestRefreshSelectionStats();
                this.isReady = true;
            });

        this.progressBar = this.page2.find('.progress').progressbar({
            value: false,
        });
        this.progressLabel = this.progressBar.find('.progresslabel');
        this.progressLog = this.page2.find('.log');
        this.statusText = $('<div class="status"></div>');

        this.dialog = $container.dialog({
            title: 'Extract Files',
            autoOpen: false,
            closeOnEscape: false,
            resizable: false,
            draggable: false,
            width: 500,
            modal: true,
            buttons: this.extractButton,
            close: () => {
                this.clear();
                leftSideFileTree.enableGlobalKeybinds = true;
            },
            open: () => { leftSideFileTree.enableGlobalKeybinds = false; },
        });
        this.dialogCloseButton = this.dialog.parent().find('.ui-dialog-titlebar .ui-dialog-titlebar-close');
        this.buttonPane = this.dialog.parent().find('.ui-dialog-buttonpane');
        this.buttonPane.append(this.errorMessage).append(this.statusText);

        this.extraction = new ExtractionHelper(this);
    }

    shouldPreserveRoot(): boolean {
        return this.preserveParentsCheckbox.is(':checked');
    }

    shouldDecompress(): boolean {
        return this.decompressCheckbox.is(':checked');
    }

    getTargetFolder(): string {
        return this.extractTarget.val() as string;
    }

    isNodeChecked(id: string) {
        let tree: any = this.filetree.jstree(true);
        // get_node uses dom operations and is too slow for us, so we take a shortcut
        let treeData = tree['_model'].data;
        let node = treeData[id];
        while (id !== '/' && !node) {
            id = dirname(id);
            node = treeData[id];
        }
        return !node || node.state.checked;
    }

    setLog(logText: string) {
        this.progressLog.val(logText);
    }

    setProgress(current: number, total: number) {
        this.progressBar.progressbar('value', current * 100 / total);
        this.progressLabel.text(current.toLocaleString() + ' / ' + total.toLocaleString());
    }

    setStatus(text: string) {
        this.statusText.text(text || '');
    }

    updateStats() {
        if (!this.currentArchive || !this.isReady) {
            this.stats.text('calculating...');
            return;
        }

        let entries: MnfEntry[];
        if (this.isFile) {
            entries = [this.currentArchive.getMnfEntry(this.currentFolder)];
        } else {
            entries = this.currentArchive.getMnfEntriesForFolder(this.currentFolder);
        }

        let size = 0;
        let count = 0;
        let decompress = this.shouldDecompress();
        entries.forEach(entry => {
            if (this.isNodeChecked(entry.fileName)) {
                let named = entry.data.named;
                if (decompress) {
                    size += named['fileSize'].value as number;
                } else {
                    size += named['compressedSize'].value as number;
                }
                count++;
            }
        });
        this.stats.text(count.toLocaleString() + ' files selected (' + formatFileSize(size, false) + ')')

        let freeDiskSpace = getFreeDiskSpace(this.extractTarget.val() as string);
        this.diskSpaceDelta = size - freeDiskSpace;

        let targetFolder = this.getTargetFolder();
        this.setError(ErrorType.INVALID_TARGET_DIRECTORY, !targetFolder || targetFolder.length === 0);
        this.setError(ErrorType.NO_FILES_SELECTED, count === 0);
        this.setError(ErrorType.NOT_ENOUGH_DISK_SPACE, size > freeDiskSpace);
    }

    setError(type: ErrorType, enabled: boolean) {
        if (!this.isReady) {
            this.errorMessage.hide();
            return;
        }

        if (enabled) {
            this.errorState.add(type);
        } else {
            this.errorState.delete(type);
        }

        type = ErrorType.OK;
        for (let i = 0; i < ERROR_LIST.length; ++i) {
            if (this.errorState.has(ERROR_LIST[i])) {
                type = ERROR_LIST[i];
                break;
            }
        }

        if (type === ErrorType.OK) {
            this.errorMessage.hide();
            this.buttonPane.find('button').button('enable');
        } else {
            this.errorMessage.text(ERROR_MESSAGE.get(type)(this)).show();
            this.buttonPane.find('button').button('disable');
        }
    }

    getTreeData(node: JSTreeNode): JSTreeNodeSettings[] {
        if (!this.currentFolder) {
            return [];
        }

        let folder = this.currentFolder;
        let archive = this.currentArchive;
        let isRoot = (node.id === '#');
        let entries: JSTreeNodeSettings[];
        if (this.isFile) {
            entries = archive.getFileEntry(folder);
        } else {
            entries = archive.getDirectoryEntries(isRoot ? folder : node.id);
        }

        if (isRoot && this.shouldPreserveRoot()) {
            let dir = this.isFile ? dirname(folder) : folder;
            let isRootDir = false;
            do {
                let parent = dirname(dir);
                isRootDir = (parent === dir);
                entries.unshift({
                    id: dir,
                    parent: isRootDir ? '#' : parent,
                    text: isRootDir ? '/' : basename(dir),
                    state: { opened: true },
                    type: 'folder'
                });
                dir = parent;
            } while (!isRootDir);
        } else {
            entries.forEach(entry => {
                if (isRoot) {
                    entry.parent = node.id;
                }
            });
        }
        entries.forEach(entry => {
            entry.state = entry.state || {};
            entry.state.checked = this.isNodeChecked(entry.id);
        });
        return entries;
    }

    open(archive: MnfArchive, folder: string, isFile = false) {
        this.isReady = false;
        this.currentArchive = archive;
        this.currentFolder = folder;
        this.isFile = isFile;

        let target = localStorage.getItem(STORAGE_KEY_TARGET) || process.cwd();
        this.extractTarget.val(target);
        this.extractTargetSource.attr('nwworkingdir', target);
        let preserve = JSON.parse(localStorage.getItem(STORAGE_KEY_PRESERVE) || 'true');
        this.preserveParentsCheckbox.prop('checked', preserve).change();
        let decompress = JSON.parse(localStorage.getItem(STORAGE_KEY_DECOMPRESS) || 'true');
        this.decompressCheckbox.prop('checked', decompress).change();

        this.page1.show();
        this.page2.hide();
        this.dialog.dialog('option', 'buttons', this.extractButton)
            .dialog('open');
        this.updateStats();
        this.filetree.jstree('refresh');
    }

    close() {
        this.dialog.dialog('close');
    }

    beginExtraction() {
        this.dialogCloseButton.hide();
        this.page1.hide();
        this.page2.show();
        this.dialog.dialog('option', 'buttons', this.cancelButton);
        this.buttonPane.find('button').button('enable');

        let entries: MnfEntry[];
        if (this.isFile) {
            entries = [this.currentArchive.getMnfEntry(this.currentFolder)];
        } else {
            entries = this.currentArchive.getMnfEntriesForFolder(this.currentFolder);
        }

        let selection: MnfEntry[] = [];
        entries.forEach(entry => {
            if (this.isNodeChecked(entry.fileName)) {
                selection.push(entry);
            }
        });
        selection.sort((a, b) => {
            return a.fileName.localeCompare(b.fileName);
        });

        this.extraction.start(this.currentArchive, this.currentFolder, selection);
    }

    finishExtraction() {
        this.dialogCloseButton.show();
        this.dialog.dialog('option', 'buttons', this.closeButton);
    }

    cancelExtraction() {
        this.buttonPane.find('button').button('disable');
        this.extraction.stop();
    }

    clear() {
        this.currentArchive = null;
        this.currentFolder = null;
        this.filetree.jstree('refresh');
        this.isReady = false;
        this.isFile = false;
        this.setStatus('');
        this.setLog('');
        this.setProgress(-1, 100);
        this.errorState.clear();
        this.errorMessage.text('').hide();
        this.stats.text('')
        this.diskSpaceDelta = -1;
        this.extraction.clear();
    }

}
