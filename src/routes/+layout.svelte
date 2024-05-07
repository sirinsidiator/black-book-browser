<script lang="ts">
    import patreonIcon from '$lib/images/patreon.svg';
    import { setupIonicBase } from 'ionic-svelte';
    /* Import all components - or do partial loading - see below */
    import 'ionic-svelte/components/all';

    /* Core CSS required for Ionic components to work properly */
    import '@ionic/core/css/core.css';

    /* Basic CSS for apps built with Ionic */
    import '@ionic/core/css/normalize.css';
    import '@ionic/core/css/structure.css';
    import '@ionic/core/css/typography.css';
    /* Optional CSS utils that can be commented out */
    import '@ionic/core/css/display.css';
    import '@ionic/core/css/flex-utils.css';
    import '@ionic/core/css/float-elements.css';
    import '@ionic/core/css/padding.css';
    import '@ionic/core/css/text-alignment.css';
    import '@ionic/core/css/text-transformation.css';
    /* Theme variables */
    import '@ionic/core/css/palettes/dark.always.css';
    import { fileTrayFullOutline, searchOutline } from 'ionicons/icons';
    import '../theme/variables.css';
    import { page } from '$app/stores';
    // import type { LayoutData } from './$types';

    /* Call Ionic's setup routine */
    setupIonicBase();
    /*
        This part - import 'ionic-svelte/components/all'; -  loads all components at once.

        This adds at least >800kb (uncompressed) to your bundle - 80 components (so do your math!!)

        You can also choose to import each component you want to use separately and leave out others.

        It is recommended to do this in this file, as you only need to do such once. But you are free
        to do this elsewhere if you like to code-split differently. 

        Example: if you replace the line import 'ionic-svelte/components/all'; with the imports below, you will see the resulting bundle being much smaller

        import 'ionic-svelte/components/ion-app';
        import 'ionic-svelte/components/ion-card';
        import 'ionic-svelte/components/ion-card-title';
        import 'ionic-svelte/components/ion-card-subtitle';
        import 'ionic-svelte/components/ion-card-header';
        import 'ionic-svelte/components/ion-card-content';
        import 'ionic-svelte/components/ion-chip';
        import 'ionic-svelte/components/ion-button';

        Click the ionic-svelte-components-all-import above to go to the full list of possible imports.

        Please don't forget to import ion-app in this file when you decide to code-split:

        import 'ionic-svelte/components/ion-app';

        You can report issues here - https://github.com/Tommertom/svelte-ionic-npm/issues
        Want to know what is happening more - follow me on Twitter - https://twitter.com/Tommertomm
        Discord channel on Ionic server - https://discordapp.com/channels/520266681499779082/1049388501629681675
    */
</script>

<ion-app>
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
    <ion-content>
        <slot />
    </ion-content>
</ion-app>

<style>
    ion-app {
        scrollbar-color: var(--ion-color-medium) transparent;
        flex-direction: row;
        --main-menu-width: 70px;
    }

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

    ion-content {
        background-color: var(--ion-background-color);
        height: 100vh;
    }
</style>
