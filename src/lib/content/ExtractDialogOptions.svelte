<script lang="ts">
    import type { InputChangeEventDetail } from '@ionic/core';
    import { open } from '@tauri-apps/plugin-dialog';
    import type ExtractionOptions from './ExtractionOptions';

    export let extracting: boolean;
    export let options: ExtractionOptions;

    const { targetFolder, preserveParents, decompressFiles } = options;

    let preserveParentsControl: HTMLIonToggleElement;
    let decompressFilesControl: HTMLIonToggleElement;

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
            <ion-input
                label="Extract to"
                value={$targetFolder}
                on:ionChange={onTargetFolderChanged}
            />
            <!-- eslint-disable-next-line svelte/valid-compile -->
            <ion-button slot="end" fill="clear" color="primary" on:click={selectLocation}
                >Choose</ion-button
            >
        </ion-item>
        <ion-item>
            <ion-toggle
                bind:this={preserveParentsControl}
                checked={$preserveParents}
                on:ionChange={onPreserveParentFoldersChanged}>Preserve parent folders</ion-toggle
            >
        </ion-item>
        <ion-item>
            <ion-toggle
                bind:this={decompressFilesControl}
                checked={$decompressFiles}
                on:ionChange={onDecompressFilesChanged}>Decompress files</ion-toggle
            >
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
