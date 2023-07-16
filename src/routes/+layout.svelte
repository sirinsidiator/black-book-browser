<script lang="ts">
    import patreonIcon from '$lib/images/patreon.svg';
    import { setupIonicBase } from 'ionic-svelte';
    import { bugOutline, fileTrayFullOutline } from 'ionicons/icons';
    import IonTabs from 'ionic-svelte/components/IonTabs.svelte';
    /* Import all components - or do partial loading - see below */
    import 'ionic-svelte/components/all';

    /* Theme variables */
    import FileBrowser from '../lib/FileBrowser.svelte';
    import '../theme/variables.css';
    import type { LayoutData } from './$types';
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
            label: 'Content',
            icon: fileTrayFullOutline,
            tab: 'content'
        },
        {
            label: 'Debug',
            icon: bugOutline,
            tab: 'debug'
        },
        {
            label: 'Patrons',
            icon: patreonIcon,
            tab: 'patrons'
        }
    ];

    export let data: LayoutData;
</script>

<ion-app>
    <ion-split-pane when="xs" content-id="main">
        <ion-menu content-id="main">
            <ion-header>
                <ion-toolbar color="tertiary">
                    <ion-title>Browser</ion-title>
                </ion-toolbar>
            </ion-header>
            <FileBrowser manager={data.stateManager} />
        </ion-menu>

        <div id="main">
            <IonTabs slot="bottom" {tabs}><slot /></IonTabs>
        </div>
    </ion-split-pane>
</ion-app>
