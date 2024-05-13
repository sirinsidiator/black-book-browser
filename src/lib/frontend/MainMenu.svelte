<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import patreonIcon from '$lib/assets/patreon.svg';
    import { fileTrayFullOutline, searchOutline } from 'ionicons/icons';
    import { onDestroy, onMount } from 'svelte';

    function onKeyNavigation(event: KeyboardEvent) {
        if (!event.ctrlKey) return;
        if ($page.route.id !== '/' && event.key === '1') {
            goto('/').catch(console.error);
        } else if ($page.route.id !== '/search' && (event.key === '2' || event.key === 'f')) {
            goto('/search').catch(console.error);
        } else if ($page.route.id !== '/patrons' && event.key === '3') {
            goto('/patrons').catch(console.error);
        } else {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
    }

    onMount(() => {
        document.addEventListener('keydown', onKeyNavigation);
    });

    onDestroy(() => {
        document.removeEventListener('keydown', onKeyNavigation);
    });
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
    <ion-label class="version" color="medium">@version</ion-label>
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

    .version {
        position: absolute;
        bottom: 10px;
        font-size: 0.8em;
    }
</style>
