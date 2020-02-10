import FileTreeEntryType from './FileTreeEntryType.js';
import MnfReader from '../mnf/MnfReader.js';
import ContentViewer from './ContentViewer.js';
import GameInstallManager from './GameInstallManager.js';

export function byTypeAndName(a: string, b: string) {
    let nodeA: JSTreeNode = this.get_node(a);
    let nodeB: JSTreeNode = this.get_node(b);

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
        data: (node: JSTreeNode, cb: JSTreeChildrenCallback) => { }
    }
};

export default class FileTree {

    $container: JQuery<HTMLElement>;
    $installList: JQuery<HTMLElement>;
    contentViewer: ContentViewer;
    gameInstallManager: GameInstallManager;
    mnfReader: MnfReader;
    enableGlobalKeybinds: boolean;

    constructor($container: JQuery<HTMLElement>) {
        this.$container = $container;
        this.enableGlobalKeybinds = true;

        TREE_OPTIONS.core.data = (node: JSTreeNode, cb: JSTreeChildrenCallback) => {
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

    addGameInstall(path: string) {
        if (this.gameInstallManager) {
            this.gameInstallManager.add(path);
            this.refresh();
        } else {
            console.warn('No GameInstallManager available');
        }
    }

    initialize() {
        let $installList = this.$installList = $('<ul></ul>');
        let $folderInput = $('<input type="file" nwdirectory>').hide()
            .on('change', () => {
                let target = $folderInput.val() as string;
                if (target) {
                    this.addGameInstall(target);
                }
            });
        let $addButton = $('<button>Add Folder</button>').button()
            .click(() => {
                $folderInput.attr('nwworkingdir', this.gameInstallManager.getLastAddedPath());
                $folderInput.click();
            });

        this.$container.append($installList).append($folderInput).append($addButton);

        $installList.jstree(TREE_OPTIONS)
            .on('keydown.jstree', '.jstree-anchor', (e: Event) => {
                let focused = ($installList.jstree(true) as any)['_data'].core.focused;
                if (focused) {
                    $installList.jstree(true).deselect_all();
                    $installList.jstree(true).select_node(focused);
                }
            }).on('select_node.jstree', (e: Event, data: JSTreeSelectedEventData) => {
                let node = data.node;
                let type = FileTreeEntryType.INVALID;
                if (node.data) {
                    type = node.data.type;
                }
                switch (type) {
                    case FileTreeEntryType.GAME_INSTALL:
                        this.contentViewer.selectGameInstall(node);
                        break;
                    case FileTreeEntryType.ARCHIVE:
                        this.contentViewer.selectArchive(node);
                        break;
                    case FileTreeEntryType.FOLDER:
                        this.contentViewer.selectFolder(node);
                        break;
                    case FileTreeEntryType.FILE:
                        this.contentViewer.selectFile(node);
                        break;
                    default:
                    // nothing to do
                }
            });

        $installList.keydown(e => {
            e.stopPropagation(); // need to avoid an infinite loop
        });
        $(document).keydown(e => {
            if (!this.enableGlobalKeybinds) {
                return;
            }
            let selection = $installList.jstree(true).get_selected();
            let id = selection.length > 0 ? selection[0] : '#';
            let $node = $installList.jstree(true).get_node(id, true);
            let $anchor = $node.find('.jstree-anchor');
            $anchor.trigger($.Event('keydown', {
                originalEvent: e
            }));
        });
    }

    refresh() {
        this.$installList.jstree('refresh');
    }

    generateRootData(cb: JSTreeChildrenCallback) {
        let children: JSTreeNodeSettings[] = [];

        this.gameInstallManager.getPaths().forEach(path => {
            children.push({
                text: path,
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
        let children: JSTreeNodeSettings[] = [];

        let installPath = node.data.gamePath;
        this.gameInstallManager.findMnfFiles(installPath).forEach(file => {
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
        this.mnfReader.read(node.data.archivePath).then(archive => {
            let entries = archive.getDirectoryEntries('/', false);
            entries.forEach(entry => delete entry.parent);
            this.contentViewer.selectArchive(node);
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
            let archive = this.mnfReader.getArchive(node.data.archivePath);
            cb(archive.getDirectoryEntries(node.data.path, false));
        }, 0);
    }

    selectArchive(node: JSTreeNode) {
        this.$installList.jstree(true).open_node(node);
    }

}
