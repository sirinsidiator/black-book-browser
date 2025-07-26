<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import CodeBlock from '../component/CodeBlock.svelte';
    import type TextFilePreviewLoader from './loader/TextFilePreviewLoader';

    interface Props {
        loader: TextFilePreviewLoader;
    }

    let { loader }: Props = $props();
</script>

<!-- eslint-disable svelte/no-at-html-tags -->
<CodeBlock language={loader.language}>{@html loader.getText()}</CodeBlock>
