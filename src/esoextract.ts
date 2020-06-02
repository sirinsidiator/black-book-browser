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
            activate: (event, ui) => {
                ui.oldPanel.addClass('hidden');
                ui.newPanel.removeClass('hidden');
                if (ui.newTab.index() === 1) {
                    fileSearch.focus();
                }
            },
        });

        let mnfReader = new MnfReader();
        let gameInstallManager = new GameInstallManager();

        let contentViewer = new ContentViewer($('#contentview'));
        contentViewer.setGameInstallManager(gameInstallManager);

        let fileTree = new FileTree($('#filetree'));
        fileTree.setContentViewer(contentViewer);
        fileTree.setGameInstallManager(gameInstallManager);
        fileTree.setMnfReader(mnfReader);

        let fileSearch = new FileSearch($('#filesearch'), $('#filesearchinput'));
        fileSearch.setFileTree(fileTree);
        fileSearch.setGameInstallManager(gameInstallManager);
        fileSearch.setMnfReader(mnfReader);

        let extractDialog = new ExtractDialog($('#dialog'));

        contentViewer.setExtractDialog(extractDialog);
        contentViewer.setFileTree(fileTree);
        contentViewer.setMnfReader(mnfReader);

        fileTree.initialize();
        fileSearch.initialize();
        initializePatreon();

        $(document).keydown(e => {
            if (extractDialog.isOpen()
                || event.target instanceof HTMLInputElement
                || (event.target instanceof HTMLElement
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