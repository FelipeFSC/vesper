<script lang="ts">
  let { steps, selected, onselect }:
    { steps: { id: string; label: string; icon: string; status: string; warn: boolean }[];
      selected: string; onselect: (id: string) => void } = $props();
</script>

<nav class="a5-steps" aria-label="Etapas do assistente">
  {#each steps as step, i (step.id)}
    <button type="button" class:on={selected === step.id} class:warn={step.warn}
      aria-current={selected === step.id ? 'step' : undefined} data-step={step.id} onclick={() => onselect(step.id)}>
      <span class="a5-n">{i + 1}</span>
      {@html step.icon}
      <span class="grow">{step.label}</span>
      {@html step.status}
    </button>
  {/each}
</nav>
