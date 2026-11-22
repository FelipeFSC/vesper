<script lang="ts">
  import { resolution, resolutions, setResolution } from '../board/resolution';
  let { onresize }: { onresize: () => void } = $props();
</script>

<label class="row" style:gap="8px">
  <span>Resolução do tabuleiro</span>
  <select id="board-resolution" value={resolution()} onchange={(event) => {
    setResolution(event.currentTarget.value);
    onresize();
  }}>
    {#each resolutions as [id, label] (id)}
      <option value={id}>{label}</option>
    {/each}
  </select>
</label>
