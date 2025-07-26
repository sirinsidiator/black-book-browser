<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import 'highlight.js/styles/base16/classic-dark.css';
    import type { Snippet } from 'svelte';

    interface Props {
        language: string;
        children?: Snippet;
    }

    let { language, children }: Props = $props();
</script>

<pre><code class="hljs language-{language}">{@render children?.()}</code></pre>

<style>
    pre,
    code {
        overflow: unset !important;
        height: 100%;
    }

    pre {
        margin: 0;
    }

    code {
        width: fit-content;
        min-width: 100%;
    }
</style>
