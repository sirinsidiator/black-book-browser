<script lang="ts">
    import { FileEntry } from '$lib/FileEntry';
    import type { FolderEntry } from '$lib/FolderEntry';
    import BackgroundService from '$lib/backend/BackgroundService';
    import type { ExtractFilesProgress, ExtractFilesRequest } from '$lib/mnf/MnfArchive';
    import FileTree from '$lib/tree/FileTree.svelte';
    import FileTreeEntryData from '$lib/tree/FileTreeEntryData';
    import type FileTreeEntryDataProvider from '$lib/tree/FileTreeEntryDataProvider';
    import {
        formatFileSize,
        getExtractionTargetFolder,
        setExtractionTargetFolder
    } from '$lib/util/FileUtil';
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
    let extractionTotal = 0;
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

    function queueAddLogEntry(entry: unknown, isError = false) {
        let message: string;
        if (entry instanceof Error) {
            message = entry.message;
        } else if (typeof entry === 'string') {
            message = entry;
        } else {
            message = String(entry);
        }

        if (isError) {
            message = `<ion-label color="danger">${message}</ion-label>`;
        }

        pendingLogEntries.push(message);

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
        extractionTotal = details.files.length;
        extractionDone = false;
        queueAddLogEntry(`Begin extracting ${currentEntry.path} to ${targetFolder}`);
        let addedErrorsIndex = 0;
        BackgroundService.getInstance()
            .extractFiles(details, (progress) => {
                if (progress.done > 0) {
                    extractionProgress = progress;
                }
                for (let i = addedErrorsIndex; i < progress.errors.length; i++) {
                    queueAddLogEntry(progress.errors[i], true);
                    addedErrorsIndex++;
                }
            })
            .then(
                (result) => {
                    for (let i = addedErrorsIndex; i < result.errors.length; i++) {
                        queueAddLogEntry(result.errors[i], true);
                        addedErrorsIndex++;
                    }
                    const duration = performance.now() - startTime;
                    const durationString =
                        duration < 1000
                            ? duration.toFixed(1) + 'ms'
                            : (duration / 1000).toFixed(1) + 's';
                    queueAddLogEntry(
                        `Finished extracting ${result.success.toLocaleString()} files in ${durationString}` +
                            (result.failed > 0 ? ` (${result.failed.toLocaleString()} failed)` : '')
                    );
                    extractionProgress = {
                        done: extractionTotal,
                        errors: []
                    };
                    console.log('extraction complete', result);
                },
                (error) => {
                    queueAddLogEntry(error, true);
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
        targetFolder = await getExtractionTargetFolder();
        extracting = false;
    }

    function setTargetFolder(path: unknown) {
        if (typeof path === 'string') {
            console.log('setting target folder to', path);
            targetFolder = path;
            setExtractionTargetFolder(path);
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
        <div class="inner">
            <ion-card class="options" color="light" class:hidden={extracting}>
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
                        <ion-button
                            slot="end"
                            fill="clear"
                            color="primary"
                            on:click={selectLocation}>Choose</ion-button
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

            <ion-card class="files" color="light" class:hidden={extracting}>
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
                <ion-card-content>
                    <div class="extraction-log" bind:this={logContainer}>
                        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                        <pre>{@html extractionLog}</pre>
                    </div>

                    {#if extractionProgress && extractionProgress.done > 0}
                        <div class="progress-text">
                            {extractionProgress.done.toLocaleString()} / {extractionTotal.toLocaleString()}
                            files processed
                        </div>
                        <ion-progress-bar value={extractionProgress.done / extractionTotal} />
                    {:else}
                        <div class="progress-text">starting...</div>
                        <ion-progress-bar type="indeterminate" />
                    {/if}
                </ion-card-content>
            </ion-card>
        </div>
    </ion-content>

    <ion-card>
        <ion-card-content>
            {#if !extracting}
                <ion-label class="summary" color="dark">
                    {fileCount.toLocaleString()} files selected | {formatFileSize(totalSize)}
                </ion-label>
                <!-- eslint-disable-next-line svelte/valid-compile -->
                <ion-button
                    expand="block"
                    color="primary"
                    disabled={fileCount === 0}
                    on:click={doExtract}>extract</ion-button
                >
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
        --width: 60vw;
        --height: 90vh;
    }

    .inner {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .options {
        flex-shrink: 0;
    }

    .files {
        flex-grow: 1;
        margin-top: 0;
        margin-bottom: 0;
    }

    .files ion-card-content {
        height: calc(100% - 42px);
    }

    ion-item {
        --background: none;
        --min-height: 30px;
    }

    ion-toggle {
        --min-height: 30px;
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
        height: calc(100% - 42px);
    }

    .extraction-log {
        height: 100%;
        overflow-y: auto;
        background-color: var(--ion-background-color);
        padding: 0 10px;
    }

    .extraction-log pre {
        white-space: pre-wrap;
    }

    .progress-text {
        text-align: center;
        margin: 5px;
    }
</style>
