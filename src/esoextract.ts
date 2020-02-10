import ContentViewer from "./frontend/ContentViewer.js";
import ExtractDialog from "./frontend/ExtractDialog.js";
import FileTree from "./frontend/FileTree.js";
import GameInstallManager from "./frontend/GameInstallManager.js";
import MnfReader from "./mnf/MnfReader.js";
import { initializePatreon } from "./frontend/Patreon.js";

export function start() {
    $(document).ready(() => {
        $('#left').resizable({
            handles: 'e',
            minWidth: 300
        });

        let mnfReader = new MnfReader();
        let gameInstallManager = new GameInstallManager();

        let contentViewer = new ContentViewer($('#contentview'));
        contentViewer.setGameInstallManager(gameInstallManager);

        let fileTree = new FileTree($('#filetree'));
        fileTree.setContentViewer(contentViewer);
        fileTree.setGameInstallManager(gameInstallManager);
        fileTree.setMnfReader(mnfReader);

        let extractDialog = new ExtractDialog($('#dialog'), fileTree);
        contentViewer.setExtractDialog(extractDialog);
        contentViewer.setFileTree(fileTree);
        contentViewer.setMnfReader(mnfReader);

        fileTree.initialize();
        initializePatreon(contentViewer);
    });
}