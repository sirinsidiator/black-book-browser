import { basename, dirname } from "path";
import type MnfReader from "../mnf/MnfReader";
import { requestSave } from "../util/FileUtil";
import { type SearchResult, SearchResultType } from "../util/SearchHelper";
import type FileTree from "./FileTree";
import FileTreeEntryType from "./FileTreeEntryType";
import type GameInstallManager from "./GameInstallManager";

const TREE_OPTIONS = {
    plugins: [
        'types',
    ],
    types: {
        file: {
            icon: 'jstree-file',
        },
        info: {
            icon: 'jstree-info',
        }
    },
    core: {
        themes: { name: 'default-dark' },
        keyboard: {
            '*': false, // don't want to end up accidentally opening all nodes
        },
        data: false
    }
};

function byPath(a: JSTreeNodeData, b: JSTreeNodeData): number {
    return a.path!.localeCompare(b.path!);
}

export default class FileSearch {
    $container: JQuery<HTMLElement>;
    $input: JQuery<HTMLElement>;
    mnfReader: MnfReader;
    fileTree: FileTree;
    $resultList: JQuery<HTMLElement>;
    gameInstallManager: GameInstallManager;
    searchResults: Map<string, SearchResult[]>;
    regexError: any;
    pattern: string | RegExp;
    isRegex: boolean;
    lastInput: string | number | string[];
    timeout: NodeJS.Timeout;
    $regexButton: JQuery<HTMLElement>;
    $saveButton: JQuery<HTMLElement>;

    constructor($container: JQuery<HTMLElement>, $input: JQuery<HTMLElement>) {
        this.$container = $container;
        this.$input = $input;
        this.searchResults = new Map();
        this.lastInput = $input.val();
    }

    setFileTree(fileTree: FileTree) {
        this.fileTree = fileTree;
    }

    setGameInstallManager(gameInstallManager: GameInstallManager) {
        this.gameInstallManager = gameInstallManager;
    }

    setMnfReader(mnfReader: MnfReader) {
        this.mnfReader = mnfReader;
    }

    initialize() {
        let that = this;
        let searchResults = this.searchResults;
        let $resultList = this.$resultList = $('<ul></ul>');

        let $saveButton = this.$saveButton = $('<button>Save Results</button>').button()
            .prop('title', 'Save the search results to disk')
            .prop('disabled', true)
            .click(() => {
                let output: string[] = [];
                let resultCount = 0;
                searchResults.forEach((results, archivePath) => {
                    resultCount += results.length;
                    let resultString = results.length.toLocaleString() + ' result' + (results.length !== 1 ? 's' : '');
                    output.push('');
                    output.push(`${archivePath} (${resultString})`);
                    results.forEach(result => {
                        output.push(result.path);
                    });
                });
                let pattern = that.isRegex ? that.pattern : `"${that.pattern}"`;
                let resultString = resultCount.toLocaleString() + ' result' + (resultCount !== 1 ? 's' : '');
                output.unshift(`input: ${pattern}, ${resultString}`);
                let data = Buffer.from(output.join('\n'));
                requestSave('searchresults.txt', data);
            });

        this.$container.append($resultList).append($saveButton);

        $resultList.jstree(TREE_OPTIONS).on('keydown.jstree', '.jstree-anchor', (e: Event) => {
            let focused = (tree as any)._data.core.focused;
            if (focused) {
                tree.deselect_all();
                tree.select_node(focused);
            }
        }).on('select_node.jstree', (e: Event, data: JSTreeSelectedEventData) => {
            let node = data.node;
            if (node.data) {
                switch (node.data.type) {
                    case FileTreeEntryType.ARCHIVE:
                        this.fileTree.selectArchive(node.data.archivePath);
                        break;
                    case FileTreeEntryType.FOLDER:
                        this.fileTree.selectFolder(node.data.archivePath, node.data.path);
                        break;
                    case FileTreeEntryType.FILE:
                        this.fileTree.selectFile(node.data.archivePath, node.data.path);
                        break;
                    default:
                        if ((node.data as any).next) {
                            (node.data as any).next();
                        }
                }
            }
        });

        let tree = $resultList.jstree(true);
        tree.settings.core.data = (node: JSTreeNode, cb: JSTreeChildrenCallback) => {
            if (node.id === '#') {
                this.generateRootData(cb);
            } else if (node.data && node.data.type === FileTreeEntryType.ARCHIVE) {
                this.generateSearchResultData(node, cb);
            } else {
                cb([{
                    text: 'Something went wrong',
                    state: { disabled: true },
                    type: 'info'
                }]);
            }
        };
        tree.refresh();

        let searchInput = this.$input;
        let $clearButton = searchInput.parent().find('.clearButton');
        $clearButton.on('click', () => {
            if (searchInput.val() !== '') {
                searchInput.val('');
                this.lastInput = '';
                this.doSearch();
            }
        });
        let $regexButton = this.$regexButton = searchInput.parent().find('.regexButton');
        $regexButton.on('click', () => {
            $regexButton.toggleClass('active');
            this.doSearch();
        });
        let doSearch = this.doSearch.bind(this);
        searchInput.on('keyup', (event: JQuery.Event) => {
            let input = searchInput.val();
            let hasChanged = input !== this.lastInput;
            if (this.timeout && hasChanged) {
                clearTimeout(this.timeout);
                this.timeout = null;
            }

            switch (event.which) {
                case 27: // escape
                    searchInput.val(this.lastInput);
                    hasChanged = false;
                // let it fall through to the return case
                case 13: // return
                    if (hasChanged) {
                        this.doSearch();
                    }
                    searchInput.blur();
                    break;
                default:
                    if (hasChanged) {
                        this.timeout = setTimeout(doSearch, 250);
                    }
            }
        });

        $resultList.keydown(e => {
            e.stopPropagation(); // need to avoid an infinite loop
        });
    }

    focus() {
        this.$input.focus();
        this.doSearch();
    }

    simulateKeyDown(e: JQuery.KeyDownEvent) {
        let tree = this.$resultList.jstree(true);
        let selection = tree.get_selected();
        let id = selection.length > 0 ? selection[0] : '#';
        let $node = tree.get_node(id, true);
        let $anchor = $node.find('.jstree-anchor');
        $anchor.trigger($.Event('keydown', {
            originalEvent: e
        }));
    }

    doSearch() {
        this.timeout = null;
        this.regexError = null;
        this.pattern = null;
        this.isRegex = this.$regexButton.hasClass('active');

        let tree = this.$resultList.jstree(true);
        let searchResults = this.searchResults;
        let disableExport = true;
        searchResults.clear();
        let archives = this.mnfReader.getArchives();
        if (archives.size > 0) {
            let input = this.lastInput = this.$input.val();
            if (!(!input || input === '')) {
                let pattern: RegExp | string;
                if (this.isRegex) {
                    try {
                        pattern = new RegExp(input as string);
                    } catch (e) {
                        console.warn("Failed to compile regex", e);
                        this.regexError = e;
                    }
                } else {
                    pattern = input as string;
                }
                this.pattern = pattern;

                if (pattern) {
                    archives.forEach(archive => {
                        let results = archive.searchHelper.search(pattern);
                        results.sort(byPath);
                        searchResults.set(archive.path, results)
                        if (results.length > 0) {
                            disableExport = false;
                        }
                    });
                }
            }
        }
        tree.refresh();
        this.$saveButton.prop('disabled', disableExport);
    }

    generateRootData(cb: JSTreeChildrenCallback) {
        let children: JSTreeNodeSettings[] = [];

        let archives = this.mnfReader.getArchives();
        if (this.regexError) {
            children.push({
                text: this.regexError,
                state: { disabled: true },
                type: 'info'
            });
        } else if (archives.size > 0) {
            archives.forEach(archive => {
                let directory = dirname(archive.path);
                let file = '\\' + basename(archive.path);
                let resultString = '';
                if (this.pattern) {
                    let results = this.searchResults.get(archive.path);
                    let resultCount = results ? results.length : 0;
                    resultString = ` (${resultCount.toLocaleString()} result${resultCount !== 1 ? 's' : ''})`;
                }
                let text = `<span class="truncate"><span>${directory}</span><span>${file}${resultString}</span></span>`;
                children.push({
                    text: text,
                    a_attr: { title: `${archive.path}${resultString}` },
                    state: { opened: true },
                    data: {
                        type: FileTreeEntryType.ARCHIVE,
                        archivePath: archive.path,
                    },
                    children: true
                });
            });
            children.sort((a, b) => a.data.archivePath.localeCompare(b.data.archivePath));
        } else {
            children.push({
                text: 'No archives scanned yet',
                state: { disabled: true },
                type: 'info'
            });
        }
        cb(children);
    }

    generateSearchResultData(node: JSTreeNode, cb: JSTreeChildrenCallback, children?: JSTreeNodeSettings[]) {
        if (!children) {
            children = [];
        } else {
            children.pop(); // remove the "show more" entry 
        }

        let results = this.searchResults.get(node.data.archivePath);
        let resultCount = results ? results.length : 0;
        let startIndex = children.length;
        let maxVisible = Math.min(startIndex + 100, resultCount);
        if (resultCount > 0) {
            for (let i = startIndex; i < maxVisible; ++i) {
                let result = results[i];
                let entryType = 'file';
                let dataType = FileTreeEntryType.FILE;
                if (result.type === SearchResultType.DIRECTORY) {
                    entryType = null;
                    dataType = FileTreeEntryType.FOLDER;
                }
                let directory = dirname(result.path);
                if (directory == '/') {
                    directory = '';
                }
                let file = '/' + basename(result.path);
                let text = `<span class="truncate"><span>${directory}</span><span>${file}</span></span>`;
                children.push({
                    text: text,
                    a_attr: { title: result.path },
                    data: {
                        type: dataType,
                        archivePath: result.archivePath,
                        path: result.path
                    },
                    type: entryType
                });
            }
            if (resultCount > maxVisible) {
                let remaining = (resultCount - maxVisible).toLocaleString();
                let child = {
                    text: `show more (${remaining} remaining)`,
                    type: 'info',
                    data: {
                        type: FileTreeEntryType.INVALID,
                        next: () => {
                            this.generateSearchResultData(node, cb, children);
                        }
                    }
                };
                children.push(child);
            }
        }

        cb(children);
    }

}