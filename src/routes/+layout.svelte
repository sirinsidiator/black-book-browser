<script lang="ts">
    import patreonIcon from '$lib/images/patreon.svg';
    import { setupIonicBase } from 'ionic-svelte';
    import { bugOutline, fileTrayFullOutline } from 'ionicons/icons';
    import IonTabs from 'ionic-svelte/components/IonTabs.svelte';
    import { onMount } from 'svelte';
    import { createGesture } from '@ionic/core';
    import ContentViewer from '../lib/content/ContentViewer.svelte';
    import type { LayoutData } from './$types';
    /* Import all components - or do partial loading - see below */
    import 'ionic-svelte/components/all';

    /* Core CSS required for Ionic components to work properly */
    import '@ionic/core/css/core.css';

    /* Basic CSS for apps built with Ionic */
    import '@ionic/core/css/normalize.css';
    import '@ionic/core/css/structure.css';
    import '@ionic/core/css/typography.css';

    /* Optional CSS utils that can be commented out */
    import '@ionic/core/css/padding.css';
    import '@ionic/core/css/float-elements.css';
    import '@ionic/core/css/text-alignment.css';
    import '@ionic/core/css/text-transformation.css';
    import '@ionic/core/css/flex-utils.css';
    import '@ionic/core/css/display.css';

    /* Theme variables */
    import '@ionic/core/css/palettes/dark.always.css';
    import '../theme/variables.css';
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

    const tabs = [
        {
            label: 'Browse',
            icon: fileTrayFullOutline,
            tab: ''
        },
        {
            label: 'Search',
            icon: bugOutline,
            tab: 'search'
        },
        {
            label: 'Patrons',
            icon: patreonIcon,
            tab: 'patrons'
        }
    ];

    export let data: LayoutData;

    let splitPane: HTMLIonSplitPaneElement;
    let divider: HTMLDivElement;
    onMount(() => {
        const gesture = createGesture({
            name: 'resize-menu',
            el: divider,
            onMove: (e) => {
                console.log('move', e);
                splitPane.style.setProperty('--side-width', `${e.currentX}px`);
            }
        });

        gesture.enable(true);
    });
</script>

<ion-app>
    <ion-split-pane bind:this={splitPane} when="xs" content-id="main">
        <ion-menu content-id="main">
            <IonTabs slot="bottom" {tabs}><slot /></IonTabs>
            <div class="divider" bind:this={divider} />
        </ion-menu>

        <div id="main">
            <ContentViewer manager={data.stateManager} />
        </div>
    </ion-split-pane>
</ion-app>

<style>
    ion-split-pane {
        --side-min-width: 10vw;
        --side-max-width: 90vw;
        --side-width: 30vw;
        --border: 3px solid var(--ion-color-light);
    }

    .divider {
        height: 100%;
        width: 3px;

        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;

        z-index: 10;

        cursor: col-resize;
    }
</style>
