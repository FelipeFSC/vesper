<script lang="ts">
  let { title, icon, closeIcon, onclose }:
    { title: string; icon: string; closeIcon: string; onclose: () => void } = $props();
</script>

<div class="win-head">
  {@html icon}
  <span class="win-title">{title}</span>
  <button type="button" class="icon-btn" title="Fechar" aria-label="Fechar" onclick={onclose}>{@html closeIcon}</button>
</div>
<div class="win-body"></div>
