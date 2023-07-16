<script lang="ts">
    import type MnfArchiveEntry from '$lib/MnfArchiveEntry';

    export let archive: MnfArchiveEntry;
</script>

<ion-list>
    <ion-item>
        <ion-label>archive path</ion-label>
        <ion-input value={archive.path} />
    </ion-item>
</ion-list>
