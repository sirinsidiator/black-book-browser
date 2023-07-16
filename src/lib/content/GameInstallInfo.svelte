<script lang="ts">
    import type { GameInstallEntry } from '$lib/GameInstallEntry';

    export let gameInstall: GameInstallEntry;
</script>

<ion-list>
    <ion-item>
        <ion-label>game path</ion-label>
        <ion-input value={gameInstall.label} />
    </ion-item>
    <ion-item>
        <ion-label>version</ion-label>
        <ion-input value={gameInstall.version.version} />
    </ion-item>
    <ion-item>
        <ion-label>build date</ion-label>
        <ion-input value={gameInstall.version.buildDate} />
    </ion-item>
    <ion-item>
        <ion-label>build number</ion-label>
        <ion-input value={gameInstall.version.buildNumber} />
    </ion-item>
</ion-list>
