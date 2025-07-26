<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import type { InputChangeEventDetail } from '@ionic/core';
    import { open } from '@tauri-apps/plugin-dialog';
    import { helpCircleOutline } from 'ionicons/icons';
    import type ExtractionOptions from './ExtractionOptions';
    import { openIgnorePatternHelp } from './ignoredFilesFilterHelper';

    interface Props {
        extracting: boolean;
        options: ExtractionOptions;
    }

    let { extracting, options }: Props = $props();

    const { targetFolder, preserveParents, decompressFiles, ignorePattern } = options;

    let preserveParentsControl: HTMLIonToggleElement;
    let decompressFilesControl: HTMLIonToggleElement;
    let ignorePatternControl: HTMLIonInputElement;

    function setTargetFolder(path: unknown) {
        if (typeof path === 'string') {
            console.log('setting target folder to', path);
            $targetFolder = path;
        }
    }

    function onTargetFolderChanged(event: CustomEvent<InputChangeEventDetail>) {
        const path = event.detail.value;
        if (typeof path === 'string') {
            console.log('setting target folder to', path);
            $targetFolder = path;
        }
    }

    function onPreserveParentFoldersChanged() {
        $preserveParents = preserveParentsControl.checked;
    }

    function onDecompressFilesChanged() {
        $decompressFiles = decompressFilesControl.checked;
    }

    function onIgnorePatternChanged() {
        $ignorePattern = (ignorePatternControl.value ?? '') as string;
    }

    async function selectLocation() {
        const selected = await open({
            directory: true,
            defaultPath: $targetFolder
        });
        setTargetFolder(selected);
    }
</script>

<ion-card class="options" color="light" class:hidden={extracting}>
    <ion-card-header>
        <ion-card-title>Options</ion-card-title>
    </ion-card-header>
    <ion-card-content>
        <ion-item>
            <ion-input label="Extract to" value={$targetFolder} onionChange={onTargetFolderChanged}
            ></ion-input>
            <ion-button slot="end" fill="clear" color="primary" onclick={selectLocation}
                >Choose</ion-button
            >
        </ion-item>
        <ion-item>
            <ion-toggle
                bind:this={preserveParentsControl}
                checked={$preserveParents}
                onionChange={onPreserveParentFoldersChanged}>Preserve parent folders</ion-toggle
            >
        </ion-item>
        <ion-item>
            <ion-toggle
                bind:this={decompressFilesControl}
                checked={$decompressFiles}
                onionChange={onDecompressFilesChanged}>Decompress files</ion-toggle
            >
        </ion-item>
        <ion-item>
            <ion-input
                bind:this={ignorePatternControl}
                label="Ignore pattern"
                placeholder="e.g. !**/*.+(lua|xml|txt)"
                value={$ignorePattern}
                onionChange={onIgnorePatternChanged}
            >
            </ion-input>
            <ion-button slot="end" fill="clear" onclick={openIgnorePatternHelp}>
                <ion-icon icon={helpCircleOutline} slot="icon-only"></ion-icon>
            </ion-button>
        </ion-item>
    </ion-card-content>
</ion-card>

<style>
    ion-card-header {
        padding-top: 10px;
        padding-bottom: 0;
    }

    ion-card-content {
        padding-top: 0;
        padding-bottom: 0;
        height: 100%;
    }

    .options {
        flex-shrink: 0;
    }

    ion-item {
        --background: none;
        --min-height: 30px;
    }

    ion-toggle {
        --min-height: 30px;
    }
</style>
