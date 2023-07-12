import ContentViewer from "./frontend/ContentViewer.js";
import ExtractDialog from "./frontend/ExtractDialog.js";
import FileSearch from "./frontend/FileSearch.js";
import FileTree from "./frontend/FileTree.js";
import GameInstallManager from "./frontend/GameInstallManager.js";
import { initializePatreon } from "./frontend/Patreon.js";
import MnfReader from "./mnf/MnfReader.js";

export function start() {
    $(document).ready(() => {
        $('#left').resizable({
            handles: 'e',
            minWidth: 300
        }).tabs({
            activate: (event: any, ui: { oldPanel: { addClass: (arg0: string) => void; }; newPanel: { removeClass: (arg0: string) => void; }; newTab: { index: () => number; }; }) => {
                ui.oldPanel.addClass('hidden');
                ui.newPanel.removeClass('hidden');
                if (ui.newTab.index() === 1) {
                    fileSearch.focus();
                }
            },
        });

        const mnfReader = new MnfReader();
        const gameInstallManager = new GameInstallManager();

        const contentViewer = new ContentViewer($('#contentview'));
        contentViewer.setGameInstallManager(gameInstallManager);

        const fileTree = new FileTree($('#filetree'));
        fileTree.setContentViewer(contentViewer);
        fileTree.setGameInstallManager(gameInstallManager);
        fileTree.setMnfReader(mnfReader);

        const fileSearch = new FileSearch($('#filesearch'), $('#filesearchinput'));
        fileSearch.setFileTree(fileTree);
        fileSearch.setGameInstallManager(gameInstallManager);
        fileSearch.setMnfReader(mnfReader);

        const extractDialog = new ExtractDialog($('#dialog'));

        contentViewer.setExtractDialog(extractDialog);
        contentViewer.setFileTree(fileTree);
        contentViewer.setMnfReader(mnfReader);

        fileTree.initialize();
        fileSearch.initialize();
        initializePatreon();

        $(document).keydown(e => {
            if (extractDialog.isOpen()
                || event?.target instanceof HTMLInputElement
                || (event?.target instanceof HTMLElement
                    && (
                        event.target.classList.contains('ui-tab')
                        || event.target.classList.contains('ui-tabs-anchor')
                    )
                )) {
                return;
            }
            console.log(e, e.target);
            if ($('#left').tabs('option', 'active') === 0) {
                fileTree.simulateKeyDown(e);
            } else {
                fileSearch.simulateKeyDown(e);
            }
        });
    });
}