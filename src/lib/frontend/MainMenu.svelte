<script lang="ts">
    import { page } from '$app/stores';
    import patreonIcon from '$lib/assets/patreon.svg';
    import { fileTrayFullOutline, searchOutline } from 'ionicons/icons';
</script>

<ion-buttons>
    <ion-button href="/" class:selected={$page.route.id === '/'}>
        <div slot="icon-only">
            <ion-icon icon={fileTrayFullOutline} />
            <div class="label">browse</div>
        </div></ion-button
    >
    <ion-button href="/search" class:selected={$page.route.id === '/search'}>
        <div slot="icon-only">
            <ion-icon icon={searchOutline} />
            <div class="label">search</div>
        </div>
    </ion-button>
    <ion-button href="/patrons" class:selected={$page.route.id === '/patrons'}>
        <div slot="icon-only">
            <ion-icon icon={patreonIcon} />
            <div class="label">patrons</div>
        </div>
    </ion-button>
</ion-buttons>

<style>
    ion-buttons {
        width: var(--main-menu-width);
        height: 100vh;
        flex-direction: column;
        background-color: var(--ion-background-color-step-100);
    }

    ion-button {
        width: 60px !important;
        height: 60px !important;
        font-size: 0.6em;
        color: var(--ion-color-medium);
    }

    ion-button.selected {
        color: var(--ion-color-primary);
    }

    ion-icon {
        font-size: 2.5em;
    }

    .label {
        margin-top: 3px;
    }
</style>
