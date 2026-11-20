<script lang="ts">
  let { tabs, selected, onselect }:
    { tabs: { id: string; label: string; icon: string }[]; selected: string; onselect: (id: string) => void } = $props();
</script>

<div class="f5-tabs" role="tablist" aria-label="Seções da ficha">
  {#each tabs as tab (tab.id)}
    <button type="button" class:on={selected === tab.id} role="tab" aria-selected={selected === tab.id}
      data-tab5={tab.id} onclick={() => onselect(tab.id)}>
      {@html tab.icon}<span>{tab.label}</span>
    </button>
  {/each}
</div>
