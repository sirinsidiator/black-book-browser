import { basename, dirname } from 'path';
import type MnfReader from '../mnf/MnfReader.js';
import type ContentViewer from './ContentViewer.js';
import FileTreeEntryType from './FileTreeEntryType.js';
import type GameInstallManager from './GameInstallManager.js';

export function byTypeAndName(this: JSTree, a: string, b: string) {
    const nodeA: JSTreeNode = this.get_node(a);
    const nodeB: JSTreeNode = this.get_node(b);

    if (nodeA.type === nodeB.type) {
        return nodeA.text.localeCompare(nodeB.text);
    }
    if (nodeA.type === 'file') {
        return 1;
    }
    if (nodeB.type === 'file') {
        return -1;
    }
    return 0;
}

const TREE_OPTIONS = {
    plugins: [
        'types',
        'sort',
    ],
    types: {
        file: {
            icon: 'jstree-file',
        }
    },
    sort: byTypeAndName,
    core: {
        themes: { name: 'default-dark' },
        keyboard: {
            '*': false, // don't want to end up accidentally opening all nodes
        },
        data: false
    }
};

export default class FileTree {
    $container: JQuery<HTMLElement>;
    $installList?: JQuery<HTMLElement>;
    contentViewer?: ContentViewer;
    gameInstallManager?: GameInstallManager;
    mnfReader?: MnfReader;
    refreshPromise?: Promise<JSTree>;
    refreshPromiseResolve?: (value?: JSTree | PromiseLike<JSTree>) => void;

    constructor($container: JQuery<HTMLElement>) {
        this.$container = $container;
    }

    setContentViewer(contentViewer: ContentViewer) {
        this.contentViewer = contentViewer;
    }

    setGameInstallManager(gameInstallManager: GameInstallManager) {
        this.gameInstallManager = gameInstallManager;
    }

    setMnfReader(mnfReader: MnfReader) {
        this.mnfReader = mnfReader;
    }

    async addGameInstall(path: string) {
        if (this.gameInstallManager) {
            if (this.gameInstallManager.add(path)) {
                await this.refresh();
                this.selectGameInstall(path);
            }
        } else {
            console.warn('No GameInstallManager available');
        }
    }

    async removeGameInstall(path: string) {
        if (this.gameInstallManager) {
            if (this.gameInstallManager.remove(path)) {
                await this.refresh();
                this.selectGameInstall();
            }
        } else {
            console.warn('No GameInstallManager available');
        }
    }

    initialize() {
        const $installList = this.$installList = $('<ul></ul>');
        const $folderInput = $('<input type="file" nwdirectory>').hide()
            .on('change', () => {
                const target = $folderInput.val() as string;
                if (target) {
                    this.addGameInstall(target);
                }
            });
        const $addButton = $('<button>Add Folder</button>').button()
            .prop('title', 'Select a folder that contains depot, game, and vo_* subfolders')
            .click(() => {
                $folderInput.val('');
                $folderInput.attr('nwworkingdir', this.gameInstallManager?.getLastAddedPath() ?? '');
                $folderInput.click();
            });

        this.$container.append($installList).append($folderInput).append($addButton);

        // init the tree without data at first and refresh later so the event callbacks work
        $installList.jstree(TREE_OPTIONS).on('keydown.jstree', '.jstree-anchor', (e: Event) => {
            const focused = (tree as any)._data.core.focused;
            if (focused) {
                tree.deselect_all();
                tree.select_node(focused);
            }
        }).on('select_node.jstree', (e: Event, data: JSTreeSelectedEventData) => {
            const node = data.node;
            let type = FileTreeEntryType.INVALID;
            if (node.data) {
                type = node.data.type;
            }
            switch (type) {
                case FileTreeEntryType.GAME_INSTALL:
                    this.contentViewer?.selectGameInstall(node);
                    break;
                case FileTreeEntryType.ARCHIVE:
                    this.contentViewer?.selectArchive(node);
                    break;
                case FileTreeEntryType.FOLDER:
                    this.contentViewer?.selectFolder(node);
                    break;
                case FileTreeEntryType.FILE:
                    this.contentViewer?.selectFile(node);
                    break;
                default:
                // nothing to do
            }
        }).on('refresh.jstree', () => {
            if (this.refreshPromiseResolve) {
                this.refreshPromiseResolve(tree);
                this.refreshPromiseResolve = undefined;
                this.refreshPromise = undefined;
            }
        });

        const tree = $installList.jstree(true);
        tree.settings.core.data = (node: JSTreeNode, cb: JSTreeChildrenCallback) => {
            if (node.id === '#') {
                this.generateRootData(cb);
            } else {
                let type = FileTreeEntryType.INVALID;
                if (node.data) {
                    type = node.data.type;
                }
                switch (type) {
                    case FileTreeEntryType.GAME_INSTALL:
                        this.generateGameInstallData(node, cb);
                        break;
                    case FileTreeEntryType.ARCHIVE:
                        this.generateArchiveData(node, cb);
                        break;
                    case FileTreeEntryType.FOLDER:
                        this.generateFolderData(node, cb);
                        break;
                    default:
                        cb([{
                            text: 'nothing to show',
                            state: { disabled: true },
                            icon: 'images/question.png'
                        }]);
                }
            }
        };
        tree.refresh();

        $installList.keydown(e => {
            e.stopPropagation(); // need to avoid an infinite loop
        });
    }

    simulateKeyDown(e: JQuery.KeyDownEvent) {
        const tree = this.$installList?.jstree(true);
        const selection = tree.get_selected();
        const id = selection.length > 0 ? selection[0] : '#';
        const $node = tree.get_node(id, true);
        const $anchor = $node.find('.jstree-anchor');
        $anchor.trigger($.Event('keydown', {
            originalEvent: e
        }));
    }

    async refresh(): Promise<JSTree> {
        if (!(this.refreshPromise instanceof Promise)) {
            this.refreshPromise = new Promise((resolve) => {
                this.refreshPromiseResolve = resolve;
                this.$installList?.jstree('refresh', true, true);
            });
        }
        return this.refreshPromise;
    }

    generateRootData(cb: JSTreeChildrenCallback) {
        const children: JSTreeNodeSettings[] = [];

        this.gameInstallManager?.getPaths().forEach(path => {
            const directory = dirname(path);
            const file = '/' + basename(path);
            const text = `<span class="truncate"><span>${directory}</span><span>${file}</span></span>`;
            children.push({
                text: text,
                state: { opened: true },
                data: {
                    type: FileTreeEntryType.GAME_INSTALL,
                    gamePath: path,
                },
                children: true
            });
        });

        cb(children);
    }

    generateGameInstallData(node: JSTreeNode, cb: JSTreeChildrenCallback) {
        const children: JSTreeNodeSettings[] = [];

        const installPath = node.data?.gamePath ?? '';
        this.gameInstallManager?.findMnfFiles(installPath).forEach(file => {
            children.push({
                text: file.substr(installPath.length + 1),
                data: {
                    type: FileTreeEntryType.ARCHIVE,
                    gamePath: installPath,
                    archivePath: file,
                    path: '/'
                },
                children: true
            });
        });

        cb(children);
    }

    generateArchiveData(node: JSTreeNode, cb: JSTreeChildrenCallback) {
        this.mnfReader?.read(node.data?.archivePath ?? '').then(archive => {
            const entries = archive.getDirectoryEntries('/', false);
            entries.forEach(entry => delete entry.parent);
            this.contentViewer?.selectArchive(node);
            cb(entries);
        }, err => {
            cb([{
                text: err.message,
                state: { disabled: true },
                icon: 'images/error.png'
            }]);
        });
    }

    generateFolderData(node: JSTreeNode, cb: JSTreeChildrenCallback) {
        setTimeout(() => {
            const archive = this.mnfReader?.getArchive(node.data?.archivePath ?? '');
            cb(archive?.getDirectoryEntries(node.data?.path ?? '', false) ?? []);
        }, 0);
    }

    selectArchive(node: JSTreeNode | string) {
        if (typeof (node) === 'string') {
            node = this.findNode(FileTreeEntryType.ARCHIVE, node) as JSTreeNode;
            this.selectNode(node);
        } else {
            this.$installList?.jstree(true).open_node(node);
        }
    }

    selectFolder(archivePath: string, path: string) {
        const node = this.findNode(FileTreeEntryType.FOLDER, archivePath, path);
        if (node) {
            this.selectNode(node);
            this.contentViewer?.selectFolder(node);
        } else {
            this.loadNode(archivePath, path).then(() => this.selectFolder(archivePath, path));
        }
    }

    selectFile(archivePath: string, path: string) {
        const node = this.findNode(FileTreeEntryType.FILE, archivePath, path);
        if (node) {
            this.selectNode(node);
            this.contentViewer?.selectFile(node);
        } else {
            this.loadNode(archivePath, path).then(() => this.selectFile(archivePath, path));
        }
    }

    selectNode(node: JSTreeNode) {
        const tree = this.$installList?.jstree(true);
        tree.deselect_all();
        tree.close_all();
        tree.select_node(node);
        const $node = $(`#${node.id}`);
        this.$installList?.scrollTop($node.prop('offsetTop') - (this.$container?.height() ?? 0) / 2);
    }

    async loadNode(archivePath: string, path: string): Promise<void> {
        return new Promise((resolve, reject) => {
            let directory = dirname(path);
            let folderNode: JSTreeNode | undefined = undefined;
            while (!folderNode && directory !== '/') {
                folderNode = this.findNode(FileTreeEntryType.FOLDER, archivePath, directory) as JSTreeNode;
                directory = dirname(directory)
            }

            if (folderNode) {
                const tree = this.$installList?.jstree(true);
                tree.load_node(folderNode, () => {
                    resolve();
                });
            } else {
                console.warn("Could not find ancestor for", archivePath, path);
                reject();
            }
        });
    }

    findNode(type: FileTreeEntryType, archivePath: string, path?: string): JSTreeNode | null {
        const tree = this.$installList?.jstree(true);
        const data = (tree as any)._model.data;

        const nodeIds = Object.keys(data);
        for (const id of nodeIds) {
            const node = data[id];
            if (node.data
                && node.data.type === type
                && node.data.archivePath === archivePath
                && (!path || node.data.path === path)) {
                return node;
            }
        }
        return null;
    }

    selectGameInstall(path?: string) {
        const tree = this.$installList?.jstree(true);
        const data = (tree as any)._model.data;
        if (!path) {
            if (!this.gameInstallManager) {
                throw new Error('not initialized');
            }
            const paths = Object.keys(this.gameInstallManager.paths);
            if (paths.length > 0) {
                path = paths[0];
            } else {
                this.contentViewer?.clearSelection();
                return;
            }
        }

        const nodeIds = Object.keys(data);
        for (const id of nodeIds) {
            const node = data[id];
            if (node.data && node.data.type === FileTreeEntryType.GAME_INSTALL && node.data.gamePath === path) {
                tree.select_node(node);
                this.contentViewer?.selectGameInstall(node);
                return;
            }
        }

        this.contentViewer?.clearSelection();
    }

}
