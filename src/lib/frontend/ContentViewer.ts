import 'jquery';
import 'jquery-ui';
import 'codemirror';
import { basename, dirname, extname, normalize, resolve } from 'path';
import type MnfReader from '../mnf/MnfReader.js';
import { Field, FieldData, FieldType, toHex } from '../util/BufferReader.js';
import { formatFileSize, mkdir, requestSave, writeFile } from '../util/FileUtil.js';
import DDSHelper from './DDSHelper.js';
import type ExtractDialog from './ExtractDialog.js';
import type FileTree from './FileTree.js';
import type GameInstallManager from './GameInstallManager.js';

const CM_MODE_MAPPING: any = {
    '.lua': 'lua',
    '.txt': 'properties',
    '.xml': 'xml',
    '.hlsl': 'clike',
    '.fxh': 'clike',
    '.frag': 'clike',
    '.vert': 'clike',
    '.geom': 'clike',
    '.comp': 'clike',
};

const DEBUG_OUTPUT_FOLDER = 'debug';
function saveDebugFile(archivePath: string, name: string, offset: string, ext: string, buffer: Buffer) {
    if (!archivePath) {
        console.warn('no archive path specified');
        return;
    }

    mkdir(DEBUG_OUTPUT_FOLDER);
    const fileName = resolve(process.cwd(), DEBUG_OUTPUT_FOLDER,
        basename(archivePath, '.mnf') + '_' + name + '@' + offset + ext);
    writeFile(fileName, buffer);
}

export default class ContentViewer {

    $container: JQuery<HTMLElement>;
    removeGameInstallButton: JQuery<HTMLElement>;
    scanArchiveButton: JQuery<HTMLElement>;
    extractFilesButton: JQuery<HTMLElement>;
    savePreviewButton: JQuery<HTMLElement>;
    content: JQuery<HTMLElement>;

    ddsHelper: DDSHelper;
    gameInstallManager?: GameInstallManager;
    fileTree?: FileTree;
    extractDialog?: ExtractDialog;
    mnfReader?: MnfReader;

    selectedNode?: JSTreeNode;
    selectedSingleFile?: boolean;
    debug: JQuery<HTMLElement>;
    textView: JQuery<HTMLElement>;
    textHelper: CodeMirror.Editor;
    selectionDetails: JQuery<HTMLElement>;
    preview: JQuery<HTMLElement>;

    constructor($container: JQuery<HTMLElement>) {
        this.$container = $container;
        this.ddsHelper = new DDSHelper();

        this.removeGameInstallButton = $container.find('#remove')
            .on('click', () => {
                const gamePath = this.selectedNode?.data?.gamePath;
                if (gamePath) {
                    this.fileTree?.removeGameInstall(gamePath);
                }
            });

        this.scanArchiveButton = $container.find('#scan')
            .on('click', () => {
                this.fileTree?.selectArchive(this.selectedNode as JSTreeNode);
            });

        this.extractFilesButton = $container.find('#extract')
            .on('click', () => {
                const data = this.selectedNode?.data;
                if (data) {
                    const archive = this.mnfReader?.getArchive(data.archivePath as string);
                    if (!archive) {
                        throw new Error('no archive found');
                    }
                    this.extractDialog?.open(archive, data.path as string, this.selectedSingleFile);
                }
            });

        this.savePreviewButton = $container.find('#save');

        $container.tabs({
            beforeActivate: (_event: any, ui: { newTab: { hasClass: (arg0: string) => any; }; }) => {
                return !ui.newTab.hasClass('right');
            },
            activate: (_event: any, ui: { newPanel: { prop: (arg0: string) => string; }; }) => {
                if (ui.newPanel.prop('id') === 'content') {
                    this.textHelper.refresh();
                }
            },
            active: 0
        });
        $container.tabs('disable', '#content');
        $container.tabs('disable', '#debug');

        const content = this.content = $container.find('#content');
        this.selectionDetails = $('<ul class="selectionDetails"></ul>').appendTo(content);
        this.preview = $('<div class="preview"></div>').appendTo(content);
        this.textView = $('<div class="textView"></div>').hide().appendTo(content);
        this.textHelper = CodeMirror(this.textView[0], {
            theme: 'abcdef',
            lineNumbers: true,
            readOnly: true
        });

        this.debug = $container.find('#debug');
        $container.show();
    }

    setMnfReader(mnfReader: MnfReader) {
        this.mnfReader = mnfReader;
    }

    setGameInstallManager(gameInstallManager: GameInstallManager) {
        this.gameInstallManager = gameInstallManager;
    }

    setFileTree(fileTree: FileTree) {
        this.fileTree = fileTree;
    }

    setExtractDialog(dialog: ExtractDialog) {
        this.extractDialog = dialog;
    }

    selectGameInstall(node: JSTreeNode) {
        if (this.selectedNode === node) {
            return;
        }
        this.clearSelection();

        this.content.addClass("gameinstall");
        this.selectedNode = node;
        this.removeGameInstallButton.show();

        const buildInfo = this.gameInstallManager?.findGameVersion(node.data?.gamePath ?? '');
        if (!buildInfo) {
            throw new Error('no build info found');
        }

        const info = this.selectionDetails;
        info.append($('<li></li>').append($('<b>game path: </b>')).append($('<span></span>').text(node.data?.gamePath ?? '')));
        info.append($('<li></li>').append($('<b>version: </b>')).append($('<span></span>').text(buildInfo.version)));
        info.append($('<li></li>').append($('<b>build date: </b>')).append($('<span></span>').text(buildInfo.buildDate)));
        info.append($('<li></li>').append($('<b>build number: </b>')).append($('<span></span>').text(buildInfo.buildNumber)));
    }

    selectArchive(node: JSTreeNode) {
        this.clearSelection();

        this.content.addClass("archive");
        this.selectedNode = node;
        this.scanArchiveButton.show();
        this.extractFilesButton.show();

        const data = node.data;
        if (!data) {
            throw new Error('no data found');
        }
        const archive = this.mnfReader?.getArchive(data.archivePath ?? '');
        if (archive) {
            this.selectionDetails.append($('<li></li>').append($('<b>archive path: </b>')).append($('<span></span>').text(data.archivePath)));
            this.generateFolderInfo(data);
            this.debug.empty();
            this.generateDebugInfo(archive.data as FieldData, archive.fileSize, archive.path);
            this.$container.tabs('disable', '#scan').tabs('enable', '#extract');
        } else {
            this.selectionDetails.append($('<li></li>').text('not scanned'));
            this.$container.tabs('disable', '#extract').tabs('enable', '#scan');
        }
    }

    selectFolder(node: JSTreeNode) {
        if (this.selectedNode === node) {
            return;
        }
        this.clearSelection();

        this.content.addClass("folder");
        this.selectedNode = node;
        this.extractFilesButton.show();

        this.generateFolderInfo(node.data as JSTreeNodeData);
    }

    selectFile(node: JSTreeNode) {
        if (this.selectedNode === node) {
            return;
        }
        this.clearSelection();

        this.content.addClass("file");
        this.selectedNode = node;
        this.selectedSingleFile = true;
        this.extractFilesButton.text("Extract File").show();

        const data = node.data;
        if (!data) {
            throw new Error('no data found');
        }
        const archive = this.mnfReader?.getArchive(data.archivePath ?? '');
        if (!archive) {
            throw new Error('no archive found');
        }
        const entry = archive.getMnfEntry(data.path ?? '');
        const named = entry.data.named;
        const fileSize = named['fileSize'].value as number;
        const compressedSize = named['compressedSize'].value as number;
        console.log(entry);

        const info = this.selectionDetails;
        info.append($('<li></li>').append($('<b>path: </b>')).append($('<span></span>').text(data.path ?? '')));
        info.append($('<li></li>').append($('<b>compressed size: </b>')).append($('<span></span>').text(formatFileSize(compressedSize))));
        info.append($('<li></li>').append($('<b>decompressed size: </b>')).append($('<span></span>').text(formatFileSize(fileSize))));

        this.debug.empty();
        this.debug.append($('<p>mnf entry:</p>'));
        this.generateDebugInfo(entry.data);
        if (entry.tableEntry) {
            this.debug.append($('<p>zosft entry:</p>'));
            this.generateDebugInfo(entry.tableEntry.data);
        }
        if (archive.fileTableEntry === entry) {
            this.debug.append($('<p>filetable:</p>'));
            this.generateDebugInfo(archive.fileTable?.data as FieldData, undefined, archive.path);
        }

        (async () => {
            this.preview.show();
            let content: Buffer;
            let ext = extname(data.path ?? '');
            if (CM_MODE_MAPPING[ext]) {
                this.textHelper.setOption('mode', CM_MODE_MAPPING[ext]);
                ext = '.text'
            }
            switch (ext) {
                case '.dds':
                    content = await archive.getContent(entry);
                    // eslint-disable-next-line no-case-declarations
                    const image = this.ddsHelper.createCanvas(content);
                    if (!image) {
                        this.preview.text('No preview available');
                        return;
                    }
                    this.preview.empty().append(image);
                    this.savePreviewButton.on('click', async () => {
                        const name = basename(entry.fileName ?? '', '.dds') + '.png';
                        const data = await this.getBufferFromCanvas(image);
                        requestSave(name, data);
                    }).show();
                    break;
                case '.text':
                    content = await archive.getContent(entry);
                    this.preview.hide();
                    this.textHelper.setValue(content.toString('utf8'));
                    this.textView.show();
                    this.textHelper.refresh();
                    break;
                default:
                    this.preview.text('No preview available');
            }
        })();
    }

    async getBufferFromCanvas(canvas: HTMLCanvasElement): Promise<Buffer> {
        return new Promise((resolve) => {
            canvas.toBlob(async blob => {
                if (!blob) {
                    throw new Error('no blob found');
                }
                const data = await blob.arrayBuffer();
                resolve(Buffer.from(data));
            });
        });
    }

    clearSelection() {
        this.removeGameInstallButton.hide();
        this.scanArchiveButton.hide();
        this.extractFilesButton.text("Extract Files").hide();
        this.savePreviewButton.text("Save Preview").hide().off('click');
        this.$container.tabs('enable');

        this.selectedNode = undefined;
        this.selectedSingleFile = false;

        this.content.removeClass("file folder archive gameinstall");
        this.selectionDetails.empty();
        this.preview.hide().text('loading ...');
        this.textHelper.setValue('');
        this.textView.hide();
        this.debug.text('nothing to show');

        if (this.$container.tabs('option', 'active') === 0) {
            this.$container.tabs('option', 'active', 1);
        }
    }

    generateFolderInfo(data: JSTreeNodeData) {
        const archive = this.mnfReader?.getArchive(data.archivePath ?? '');
        if (!archive) {
            throw new Error('no archive found');
        }
        const entries = archive.getMnfEntriesForFolder(data.path ?? '');

        const folders: any = {};
        let compressedSize = 0;
        let decompressedSize = 0;
        const fileList: string[] = [];
        entries.forEach(entry => {
            fileList.push(entry.fileName ?? '');
            const named = entry.data.named;
            compressedSize += named['fileSize'].value as number;
            decompressedSize += named['compressedSize'].value as number;
            let dir = dirname(entry.fileName ?? '');
            while (dir !== data.path) {
                if (!folders[dir]) {
                    folders[dir] = true;
                } else {
                    break;
                }
                dir = dirname(dir);
            }
        });

        const info = this.selectionDetails;
        info.append($('<li></li>').append($('<b>path: </b>')).append($('<span></span>').text(data.path ?? '')));
        info.append($('<li></li>').append($('<b>folders: </b>')).append($('<span></span>').text(Object.keys(folders).length.toLocaleString())));
        info.append($('<li></li>').append($('<b>files: </b>')).append($('<span></span>').text(entries.length.toLocaleString())));
        info.append($('<li></li>').append($('<b>compressed size: </b>')).append($('<span></span>').text(formatFileSize(compressedSize))));
        info.append($('<li></li>').append($('<b>decompressed size: </b>')).append($('<span></span>').text(formatFileSize(decompressedSize))));

        fileList.sort();
        this.textHelper.setOption('mode', 'filelist');
        this.textHelper.setValue(fileList.join("\n"));
        this.textView.show();
        this.textHelper.refresh();

        this.savePreviewButton.text("Save Filelist").on('click', async () => {
            const parts = [];
            if (data.archivePath) {
                parts.push(basename(data.archivePath, '.mnf'));
            }
            if (data.path) {
                parts.push(data.path);
            }
            parts.push('filelist.txt');

            const name = normalize(parts.join('/'));
            const fileListData = Buffer.from(fileList.join('\n'));
            requestSave(name, fileListData);
        }).show();
    }

    generateDebugInfo(data: FieldData, fileSize?: number, archivePath?: string) {
        const table = $('<table></table>').appendTo(this.debug);
        table.append($('<tr></tr>')
            .append($('<th></th>').text('name'))
            .append($('<th></th>').text('offset'))
            .append($('<th></th>').text('type'))
            .append($('<th></th>').text('BO'))
            .append($('<th></th>').text('value'))
            .append($('<th></th>').text('hex')));

        if (fileSize) {
            table.append($('<tr></tr>')
                .append($('<td></td>').addClass('text').text('file size'))
                .append($('<td></td>'))
                .append($('<td></td>').addClass('text'))
                .append($('<td></td>'))
                .append($('<td colspan="2"></td>').addClass('text').text(formatFileSize(fileSize))));
        }

        data.fields.forEach((entry: Field) => {
            const row = $('<tr></tr>').appendTo(table);
            const name = (entry.name || 'unknown');
            let offset = '';
            let type = '';
            let endianness = '';
            if (entry.offset >= 0) {
                offset = toHex(entry.offset);
                type = FieldType[entry.definition.type];
                if (entry.definition.type >= FieldType.UINT16 && entry.definition.type <= FieldType.UINT32) {
                    endianness = (entry.definition.bigEndian ? 'BE' : 'LE');
                }
            }
            row.append($('<td></td>').addClass('text').text(name));
            row.append($('<td></td>').text(offset));
            row.append($('<td></td>').addClass('text').text(type));
            row.append($('<td></td>').text(endianness));

            let isNumeric = false;
            let byteLength = 0;
            switch (entry.definition.type) {
                case FieldType.UINT8:
                    isNumeric = true;
                    byteLength = 1;
                    break;
                case FieldType.UINT16:
                    isNumeric = true;
                    byteLength = 2;
                    break;
                case FieldType.UINT32:
                    isNumeric = true;
                    byteLength = 4;
                    break;
                case FieldType.UINT16_ARRAY:
                    // eslint-disable-next-line no-case-declarations
                    const values = entry.value as number[];
                    // eslint-disable-next-line no-case-declarations
                    const list = $('<ol start="0"></ol>');
                    values.forEach((value: number) => {
                        $('<li></li>').text(value.toLocaleString() + ' (' + toHex(value, 2) + ')').appendTo(list);
                    });
                    row.append($('<td colspan="2"></td>').append(list));
                    break;
                case FieldType.BINARY:
                    // eslint-disable-next-line no-case-declarations
                    const buffer = entry.value as Buffer;
                    row.append($('<td></td>').text(buffer.slice(0, 10).toString('hex').toUpperCase()));
                    // eslint-disable-next-line no-case-declarations
                    const button = $('<button>save</button>').button().click(() => {
                        saveDebugFile(archivePath ?? '', name, offset, '.dat', buffer);
                    });
                    row.append($('<td></td>').append(button));
                    break;
                case FieldType.STRING:
                    // eslint-disable-next-line no-case-declarations
                    const text = entry.value as string;
                    row.append($('<td></td>').text(text.substr(0, 20)));
                    // eslint-disable-next-line no-case-declarations
                    const button2 = $('<button>save</button>').button().click(() => {
                        saveDebugFile(archivePath ?? '', name, offset, '.txt', new Buffer(text, 'utf8'));
                    });
                    row.append($('<td></td>').append(button2));
                    break;
                default:
                    // eslint-disable-next-line no-case-declarations
                    const value = entry.value as number;
                    row.append($('<td></td>').text(value));
                    row.append($('<td></td>').text(toHex(value)));
                    break;
            }

            if (isNumeric) {
                const value = entry.value as number;
                row.append($('<td></td>').text(value.toLocaleString()));
                row.append($('<td></td>').text(toHex(value, byteLength)));
            }
        });
    }

}
