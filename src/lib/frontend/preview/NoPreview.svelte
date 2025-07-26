<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import { informationCircleOutline } from 'ionicons/icons';
    import ContentPreviewText from './ContentPreviewText.svelte';
    import type { ContentPreviewLoader } from './loader/ContentPreviewLoader';

    interface Props {
        loader: ContentPreviewLoader;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let { loader }: Props = $props();
</script>

<ContentPreviewText icon={informationCircleOutline}>no preview available</ContentPreviewText>
