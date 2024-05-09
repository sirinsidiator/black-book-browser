<script lang="ts">
    import { FileEntry } from '$lib/FileEntry';
    import type { FolderEntry } from '$lib/FolderEntry';
    import BackgroundService from '$lib/backend/BackgroundService';
    import type { ExtractFilesProgress, ExtractFilesRequest } from '$lib/mnf/MnfArchive';
    import TauriHelper from '$lib/tauri/TauriHelper';
    import FileTree from '$lib/tree/FileTree.svelte';
    import FileTreeEntryData from '$lib/tree/FileTreeEntryData';
    import type FileTreeEntryDataProvider from '$lib/tree/FileTreeEntryDataProvider';
    import { formatFileSize } from '$lib/util/FileUtil';
    import type { InputChangeEventDetail } from '@ionic/core';
    import { open } from '@tauri-apps/plugin-dialog';
    import { closeOutline } from 'ionicons/icons';
    import { get } from 'svelte/store';

    export let target: FolderEntry | FileEntry;

    let dialog: HTMLIonModalElement;
    let preserveParents: HTMLIonToggleElement;
    let decompressFiles: HTMLIonToggleElement;
    let logContainer: HTMLDivElement;
    let rootEntry: FileTreeEntryData<FileTreeEntryDataProvider>;
    let currentEntry: FileTreeEntryData<FileTreeEntryDataProvider>;
    let entries: Promise<FileTreeEntryData<FileTreeEntryDataProvider>[]> = Promise.resolve([]);
    let fileCount = 0;
    let totalSize = 0;
    let extracting = false;
    let pendingLogEntries: string[] = [];
    let logFlushHandle: NodeJS.Timeout | null = null;
    let extractionLog: string = '';
    let extractionProgress: ExtractFilesProgress | null = null;
    let extractionDone = false;

    function close() {
        dialog.dismiss().catch(console.error);
    }

    function flushLogEntries() {
        logFlushHandle = null;
        if (extractionLog !== '') {
            pendingLogEntries.unshift(extractionLog);
        }
        extractionLog = pendingLogEntries.join('\n');
        pendingLogEntries.length = 0;
        setTimeout(scrollLogToBottom, 0);
    }

    function scrollLogToBottom() {
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    function queueAddLogEntry(entry: unknown) {
        if (entry instanceof Error) {
            pendingLogEntries.push(entry.message);
        } else if (typeof entry === 'string') {
            pendingLogEntries.push(entry);
        } else {
            pendingLogEntries.push(String(entry));
        }

        if (logFlushHandle === null) {
            logFlushHandle = setTimeout(flushLogEntries, 100);
        }
    }

    function doExtract() {
        const startTime = performance.now();
        const root = getRootEntry();
        const details: ExtractFilesRequest = {
            archivePath: (root.data as FolderEntry).archive.path,
            targetFolder,
            rootPath: root.path,
            preserveParents: preserveParents.checked,
            decompressFiles: decompressFiles.checked,
            files: root.getSelectedFiles()
        };
        console.log('extracting files', details);
        extracting = true;
        extractionLog = '';
        extractionProgress = null;
        extractionDone = false;
        queueAddLogEntry(`begin extracting ${currentEntry.path} to ${targetFolder}`);
        BackgroundService.getInstance()
            .extractFiles(details, (progress) => {
                extractionProgress = progress;
                if (progress.error) {
                    queueAddLogEntry(
                        'Failed to extract ' + details.files[progress.current].fileName + ':'
                    );
                    queueAddLogEntry(progress.error);
                }
            })
            .then(
                (result) => {
                    const duration = performance.now() - startTime;
                    const durationString =
                        duration < 1000 ? duration + 'ms' : (duration / 1000).toFixed(1) + 's';
                    queueAddLogEntry(
                        `finished extracting ${result.success.toLocaleString()} files in ${durationString}` +
                            (result.failed > 0 ? ` (${result.failed.toLocaleString()} failed)` : '')
                    );
                    console.log('extraction complete', result);
                },
                (error) => {
                    queueAddLogEntry(error);
                    console.error('extraction failed', error);
                }
            )
            .finally(() => {
                extractionDone = true;
            });
    }

    async function updateEntries(target: FolderEntry | FileEntry) {
        let root = target;
        while (root.parent) {
            root = root.parent;
        }
        rootEntry = new FileTreeEntryData(root);

        currentEntry = rootEntry;
        do {
            await currentEntry.toggleOpen();
            const children = get(currentEntry.children);
            let nextEntry = children.find((entry) => target.path.startsWith(entry.data.path));
            if (nextEntry) {
                currentEntry = nextEntry as FileTreeEntryData<FolderEntry>;
            } else {
                break;
            }
        } while (currentEntry.data !== target);
        currentEntry.setChecked(true);
        if (!get(currentEntry.opened)) {
            await currentEntry.toggleOpen();
        }

        refreshSummary();
        return getTreeEntries();
    }

    let targetFolder: string;
    async function refresh() {
        entries = updateEntries(target);
        targetFolder = await TauriHelper.getInstance().getExtractionTargetFolder();
        extracting = false;
    }

    function setTargetFolder(path: unknown) {
        if (typeof path === 'string') {
            console.log('setting target folder to', path);
            targetFolder = path;
            TauriHelper.getInstance().setExtractionTargetFolder(path);
        }
    }

    function onTargetFolderChanged(event: CustomEvent<InputChangeEventDetail>) {
        setTargetFolder(event.detail.value);
    }

    function onPreserveParentFoldersChanged() {
        entries = Promise.resolve(getTreeEntries());
        refreshSummary();
    }

    function getTreeEntries() {
        if (preserveParents.checked) {
            return [rootEntry];
        } else if (currentEntry.data instanceof FileEntry) {
            return [currentEntry];
        } else {
            return get(currentEntry.children);
        }
    }

    function getRootEntry() {
        if (preserveParents.checked) {
            return rootEntry;
        } else if (currentEntry.data instanceof FileEntry) {
            return currentEntry.parent!;
        } else {
            return currentEntry;
        }
    }

    function onDecompressFilesChanged() {
        refreshSummary();
    }

    function refreshSummary() {
        console.log('refreshing summary');
        const root = getRootEntry();
        const selectedFiles = root.getSelectedFiles();
        fileCount = selectedFiles.length;
        if (decompressFiles.checked) {
            totalSize = selectedFiles.reduce((acc, entry) => acc + entry.size, 0);
        } else {
            totalSize = selectedFiles.reduce((acc, entry) => acc + entry.compressedSize, 0);
        }
    }

    async function selectLocation() {
        const selected = await open({
            directory: true,
            defaultPath: targetFolder
        });
        setTargetFolder(selected);
    }
</script>

<ion-modal
    trigger="open-extract-dialog"
    bind:this={dialog}
    can-dismiss={!extracting || extractionDone}
    on:willPresent={refresh}
>
    <ion-header>
        <ion-toolbar>
            <ion-title>Extract Files</ion-title>
            {#if !extracting || extractionDone}
                <ion-buttons slot="end">
                    <!-- eslint-disable-next-line svelte/valid-compile -->
                    <ion-button on:click={close}>
                        <ion-icon slot="icon-only" icon={closeOutline} />
                    </ion-button>
                </ion-buttons>
            {/if}
        </ion-toolbar>
    </ion-header>
    <ion-content>
        <ion-card color="light" class:hidden={extracting}>
            <ion-card-header>
                <ion-card-title>Options</ion-card-title>
            </ion-card-header>
            <ion-card-content>
                <ion-item>
                    <ion-input
                        label="Extract to"
                        value={targetFolder}
                        on:ionChange={onTargetFolderChanged}
                    />
                    <!-- eslint-disable-next-line svelte/valid-compile -->
                    <ion-button slot="end" fill="clear" color="primary" on:click={selectLocation}
                        >Choose</ion-button
                    >
                </ion-item>
                <ion-item>
                    <ion-toggle
                        bind:this={preserveParents}
                        checked={true}
                        on:ionChange={onPreserveParentFoldersChanged}
                        >Preserve parent folders</ion-toggle
                    >
                </ion-item>
                <ion-item>
                    <ion-toggle
                        bind:this={decompressFiles}
                        checked={true}
                        on:ionChange={onDecompressFilesChanged}>Decompress files</ion-toggle
                    >
                </ion-item>
            </ion-card-content>
        </ion-card>

        <ion-card color="light" class:hidden={extracting}>
            <ion-card-header>
                <ion-card-title>Files</ion-card-title>
            </ion-card-header>
            <ion-card-content>
                {#await entries}
                    <div class="status">
                        <p>Loading...</p>
                        <ion-progress-bar type="indeterminate" />
                    </div>
                {:then entries}
                    <FileTree {entries} checkable={true} on:change={refreshSummary} />
                {/await}
            </ion-card-content>
        </ion-card>

        <ion-card color="light" class="progress" class:hidden={!extracting}>
            <ion-card-header>
                <ion-card-title>Extraction in progress...</ion-card-title>
            </ion-card-header>
            <ion-card-content>
                <div class="extraction-log" bind:this={logContainer}>
                    <pre>{extractionLog}</pre>
                </div>

                {#if extractionProgress}
                    <div class="progress-text">
                        {extractionProgress.current.toLocaleString()} / {extractionProgress.total.toLocaleString()}
                        files processed
                    </div>
                    <ion-progress-bar
                        value={extractionProgress.current}
                        buffer={extractionProgress.total}
                    >
                    </ion-progress-bar>
                {:else}
                    <div class="progress-text">starting...</div>
                    <ion-progress-bar type="indeterminate" />
                {/if}
            </ion-card-content>
        </ion-card>
    </ion-content>

    <ion-card>
        <ion-card-content>
            {#if !extracting}
                <ion-label class="summary" color="dark">
                    {fileCount.toLocaleString()} files selected | {formatFileSize(totalSize)}
                </ion-label>
                <!-- eslint-disable-next-line svelte/valid-compile -->
                <ion-button expand="block" color="primary" on:click={doExtract}>extract</ion-button>
            {:else}
                <!-- eslint-disable-next-line svelte/valid-compile -->
                <ion-button
                    expand="block"
                    color="primary"
                    disabled={!extractionDone}
                    on:click={close}>close</ion-button
                >
            {/if}
        </ion-card-content>
    </ion-card>
</ion-modal>

<style>
    ion-modal {
        --width: 80vw;
        --height: 80vh;
    }

    ion-item {
        --background: none;
    }

    .summary {
        margin: 10px;
        display: inline-block;
    }

    .hidden {
        display: none;
    }

    .progress {
        height: calc(100% - 20px);
    }

    .progress ion-card-content {
        height: calc(100% - 56px);
    }

    .extraction-log {
        height: calc(100% - 40px);
        overflow-y: auto;
        background-color: var(--ion-background-color);
        padding: 0 10px;
    }

    .progress-text {
        text-align: center;
        margin: 5px;
    }
</style>
