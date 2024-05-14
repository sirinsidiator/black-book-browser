<script lang="ts">
    import { downloadOutline } from 'ionicons/icons';
    import type { ContentPreviewLoader } from './loader/ContentPreviewLoader';

    export let preview: Promise<ContentPreviewLoader>;

    let disabled = true;

    async function save() {
        (await preview).save();
    }

    async function refresh(preview: Promise<ContentPreviewLoader>) {
        disabled = true;
        disabled = !(await preview).canSave;
    }

    $: refresh(preview).catch(console.error);
</script>

<!-- eslint-disable-next-line svelte/valid-compile -->
<ion-button color="primary" {disabled} on:click={save}>
    <ion-icon slot="start" icon={downloadOutline} />
    <slot />
</ion-button>
