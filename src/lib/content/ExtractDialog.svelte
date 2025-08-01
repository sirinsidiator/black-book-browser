<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import { FileEntry } from '$lib/FileEntry';
    import { FolderEntry } from '$lib/FolderEntry';
    import BackgroundService from '$lib/backend/BackgroundService';
    import type { ExtractFilesProgress, ExtractFilesRequest } from '$lib/mnf/MnfArchive';
    import type { MnfFileData } from '$lib/mnf/MnfFileData';
    import FileTree from '$lib/tree/FileTree.svelte';
    import FileTreeEntryData from '$lib/tree/FileTreeEntryData';
    import type FileTreeEntryDataProvider from '$lib/tree/FileTreeEntryDataProvider';
    import { formatFileSize } from '$lib/util/FileUtil';
    import { openPath } from '@tauri-apps/plugin-opener';
    import { archiveOutline, closeOutline } from 'ionicons/icons';
    import { get } from 'svelte/store';
    import ExtractDialogOptions from './ExtractDialogOptions.svelte';
    import ExtractionOptions from './ExtractionOptions';
    import { filterIgnoredFiles } from './ignoredFilesFilterHelper';

    interface Props {
        target: FolderEntry | FileEntry;
    }

    let { target }: Props = $props();

    const options = new ExtractionOptions();
    const { targetFolder, preserveParents, decompressFiles, ignorePattern } = options;

    let dialog: HTMLIonModalElement | undefined = $state();
    let logContainer: HTMLDivElement | undefined = $state();
    let rootEntry: FileTreeEntryData<FileTreeEntryDataProvider> | undefined = $state();
    let currentEntry: FileTreeEntryData<FileTreeEntryDataProvider> | undefined = $state();
    let entries: Promise<FileTreeEntryData<FileTreeEntryDataProvider>[]> = $state(
        Promise.resolve([])
    );
    let fileCount = $state(0);
    let totalSize = $state(0);
    let extracting = $state(false);
    let pendingLogEntries: string[] = [];
    let logFlushHandle: NodeJS.Timeout | null = null;
    let extractionLog = $state('');
    let extractionTotal = $state(0);
    let extractionProgress: ExtractFilesProgress | null = $state(null);
    let extractionDone = $state(false);
    let levelOffset = $state(0);
    let dialogVisible = $state(false);
    let selectedContent: FileTreeEntryDataProvider | null = $state(null);
    let refreshingSummary = $state(false);
    let selectedFiles: MnfFileData[] = [];

    function close() {
        dialog?.dismiss().catch(console.error);
    }

    function openTargetFolder() {
        openPath($targetFolder).catch(console.error);
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
        if (!logContainer) return;
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
        logFlushHandle ??= setTimeout(flushLogEntries, 100);
    }

    function doExtract() {
        const startTime = performance.now();
        const root = getRootEntry($preserveParents);
        if (!root) throw new Error('No root entry found for extraction');
        if (!currentEntry) throw new Error('No current entry set for extraction');
        const details: ExtractFilesRequest = {
            archivePath: (root.data as FolderEntry).archive.path,
            targetFolder: $targetFolder,
            rootPath: root.path,
            preserveParents: $preserveParents,
            decompressFiles: $decompressFiles,
            files: selectedFiles
        };
        console.log('extracting files', details);
        extracting = true;
        extractionLog = '';
        extractionProgress = null;
        extractionTotal = details.files.length;
        extractionDone = false;
        queueAddLogEntry(`Begin extracting ${currentEntry.path} to ${$targetFolder}`);
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
                (error: unknown) => {
                    queueAddLogEntry(error, true);
                    console.error('extraction failed', error);
                }
            )
            .finally(() => {
                extractionDone = true;
            });
    }

    async function updateEntries(
        target: FolderEntry | FileEntry
    ): Promise<FileTreeEntryData<FileTreeEntryDataProvider>[]> {
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

        refreshSummary($preserveParents, $decompressFiles, $ignorePattern).catch(console.error);
        return getTreeEntries($preserveParents);
    }

    function refresh() {
        entries = updateEntries(target);
        extracting = false;
    }

    function onPreserveParentFoldersChanged(preserveParents: boolean) {
        entries = Promise.resolve(getTreeEntries(preserveParents));
        levelOffset = getLevelOffset(preserveParents);
        refreshSummary(preserveParents, $decompressFiles, $ignorePattern).catch(console.error);
    }

    function getTreeEntries(preserveParents: boolean) {
        if (preserveParents) {
            if (!rootEntry) {
                return [];
            }
            return [rootEntry];
        } else if (!currentEntry) {
            throw new Error('No current entry set for getting tree entries');
        } else if (currentEntry.data instanceof FileEntry) {
            return [currentEntry];
        } else {
            return get(currentEntry.children);
        }
    }

    function getRootEntry(preserveParents: boolean) {
        if (preserveParents) {
            return rootEntry;
        } else if (!currentEntry) {
            throw new Error('No current entry set for getting root entry');
        } else if (currentEntry.data instanceof FileEntry) {
            return currentEntry.parent;
        } else {
            return currentEntry;
        }
    }

    function getLevelOffset(preserveParents: boolean) {
        if (preserveParents) {
            return 0;
        } else if (!currentEntry) {
            throw new Error('No current entry set for getting level offset');
        } else if (currentEntry.data instanceof FileEntry) {
            return -currentEntry.level;
        } else {
            return -(currentEntry.level + 1);
        }
    }

    function onDecompressFilesChanged(decompressFiles: boolean) {
        refreshSummary($preserveParents, decompressFiles, $ignorePattern).catch(console.error);
    }

    function onIgnorePatternChanged(ignorePattern: string) {
        refreshSummary($preserveParents, $decompressFiles, ignorePattern).catch(console.error);
    }

    async function refreshSummary(
        preserveParents: boolean,
        decompressFiles: boolean,
        ignorePattern: string
    ) {
        const root = getRootEntry(preserveParents);
        if (!root) return;
        refreshingSummary = true;

        selectedFiles = root.getSelectedFiles();
        if (ignorePattern) {
            selectedFiles = await filterIgnoredFiles(ignorePattern, selectedFiles);
        }

        fileCount = selectedFiles.length;
        if (decompressFiles) {
            totalSize = selectedFiles.reduce((acc, entry) => acc + entry.size, 0);
        } else {
            totalSize = selectedFiles.reduce((acc, entry) => acc + entry.compressedSize, 0);
        }
        refreshingSummary = false;
    }

    function onShow() {
        dialogVisible = true;
        selectedContent = target;
        refresh();
    }

    function onHide() {
        dialogVisible = false;
    }

    function onselect(entry: FileTreeEntryData<FileTreeEntryDataProvider>) {
        selectedContent = entry.data;
    }

    $effect(() => {
        onPreserveParentFoldersChanged($preserveParents);
    });
    $effect(() => {
        onDecompressFilesChanged($decompressFiles);
    });
    $effect(() => {
        onIgnorePatternChanged($ignorePattern);
    });
</script>

<ion-button color="primary" id="open-extract-dialog">
    <ion-icon slot="start" icon={archiveOutline}></ion-icon>
    {#if target instanceof FolderEntry}
        extract folder
    {:else}
        extract file
    {/if}
</ion-button>

<ion-modal
    trigger="open-extract-dialog"
    bind:this={dialog}
    can-dismiss={!extracting || extractionDone}
    onwillPresent={onShow}
    ondidDismiss={onHide}
>
    {#if dialogVisible}
        <ion-header>
            <ion-toolbar>
                <ion-title>Extract Files</ion-title>
                {#if !extracting || extractionDone}
                    <ion-buttons slot="end">
                        <ion-button onclick={close}>
                            <ion-icon slot="icon-only" icon={closeOutline}></ion-icon>
                        </ion-button>
                    </ion-buttons>
                {/if}
            </ion-toolbar>
        </ion-header>
        <ion-content>
            <div class="inner">
                <ExtractDialogOptions {options} {extracting} />

                <ion-card class="files" color="light" class:hidden={extracting}>
                    <ion-card-header>
                        <ion-card-title>Files</ion-card-title>
                    </ion-card-header>
                    <ion-card-content>
                        {#await entries}
                            <div class="status">
                                <p>Loading...</p>
                                <ion-progress-bar type="indeterminate"></ion-progress-bar>
                            </div>
                        {:then entries}
                            <FileTree
                                {entries}
                                checkable={true}
                                {selectedContent}
                                onchange={() =>
                                    refreshSummary(
                                        $preserveParents,
                                        $decompressFiles,
                                        $ignorePattern
                                    )}
                                {onselect}
                                {levelOffset}
                                keyboardNavigationTarget={dialog}
                                ignorePattern={$ignorePattern}
                            />
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
                            <ion-progress-bar value={extractionProgress.done / extractionTotal}
                            ></ion-progress-bar>
                        {:else}
                            <div class="progress-text">starting...</div>
                            <ion-progress-bar type="indeterminate"></ion-progress-bar>
                        {/if}
                    </ion-card-content>
                </ion-card>

                <ion-card class="footer">
                    <ion-card-content>
                        {#if !extracting}
                            <ion-label class="summary" color="dark">
                                {#if refreshingSummary}
                                    <ion-skeleton-text animated></ion-skeleton-text>
                                {:else}
                                    {fileCount.toLocaleString()} files selected | {formatFileSize(
                                        totalSize
                                    )}
                                {/if}
                            </ion-label>
                            <ion-button
                                expand="block"
                                color="primary"
                                disabled={refreshingSummary || fileCount === 0}
                                onclick={doExtract}>extract</ion-button
                            >
                        {:else}
                            <ion-button
                                expand="block"
                                color="primary"
                                disabled={!extractionDone}
                                onclick={close}>close</ion-button
                            >
                        {/if}
                        <ion-button
                            expand="block"
                            color="medium"
                            disabled={!$targetFolder}
                            onclick={openTargetFolder}>open folder</ion-button
                        >
                    </ion-card-content>
                </ion-card>
            </div>
        </ion-content>
    {/if}
</ion-modal>

<style>
    ion-modal {
        --width: 60vw;
        --height: 90vh;
    }

    ion-card-header {
        padding-top: 10px;
        padding-bottom: 0;
    }

    ion-card-content {
        padding-top: 0;
        padding-bottom: 0;
        height: 100%;
    }

    ion-skeleton-text {
        width: 330px;
    }

    .inner {
        display: flex;
        flex-direction: column;
        height: calc(var(--height) - 56px);
    }

    .footer {
        flex-shrink: 0;
    }

    .files {
        flex-grow: 1;
        margin-top: 0;
        margin-bottom: 0;
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
        flex-grow: 1;
        margin-bottom: 0;
    }

    .progress ion-card-content {
        height: calc(100% - 42px);
        padding-top: 16px;
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
