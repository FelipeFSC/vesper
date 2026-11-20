<script lang="ts">
  interface Item {
    key: string;
    ref: string;
    name: string;
    armor: string | null;
    equipped: boolean;
    attuned: boolean | null;
    quantity: number;
    weight: string;
    details: HTMLElement | null;
    changeEquipped: (equipped: boolean) => void;
    changeAttuned: (attuned: boolean) => void;
    changeQuantity: (quantity: string) => void;
    toggle: () => void;
    remove: () => void;
  }
  let { rows, readonly, removeIcon }: { rows: Item[]; readonly: boolean; removeIcon: string } = $props();
  function appendDetails(node: HTMLElement, details: HTMLElement | null) {
    if (details) node.append(details);
  }
</script>

<div class="f5-items">
  {#each rows as row, i (row.key)}
    <div class="f5-item" class:open={row.details} data-item={row.ref} use:appendDetails={row.details}>
      <div class="f5-item-row">
        <input type="checkbox" checked={row.equipped} disabled={readonly}
          title={row.armor ? 'Vestido (conta na CA)' : 'Equipado'} aria-label={'Equipar ' + row.name} data-eq={i}
          onchange={(event) => row.changeEquipped(event.currentTarget.checked)} />
        <button type="button" class="f5-link f5-item-name grow" aria-expanded={!!row.details} onclick={row.toggle}>
          {row.name}{#if row.armor}<small class="muted"> CA {row.armor}</small>{/if}
        </button>
        {#if row.attuned !== null}
          <label class="check-row small-text" title="Sintonizado">
            <input type="checkbox" checked={row.attuned} disabled={readonly}
              onchange={(event) => row.changeAttuned(event.currentTarget.checked)} /> Sint.
          </label>
        {/if}
        <input type="number" class="num" value={row.quantity} disabled={readonly} title="Quantidade" aria-label="Quantidade"
          data-f={'it-qty-' + i} onchange={(event) => row.changeQuantity(event.currentTarget.value)} />
        <span class="muted small-text f5-item-w">{row.weight}</span>
        {#if !readonly}
          <button type="button" class="icon-btn" title="Remover item" aria-label="Remover item" onclick={row.remove}>
            {@html removeIcon}
          </button>
        {/if}
      </div>
    </div>
  {/each}
</div>
