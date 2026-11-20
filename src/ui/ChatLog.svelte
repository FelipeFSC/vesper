<script lang="ts">
  import type { Readable } from 'svelte/store';
  let { messages }: { messages: Readable<{ key: string; html: string }[]> } = $props();
</script>

{#each $messages as message (message.key)}
  {@html message.html}
{/each}
