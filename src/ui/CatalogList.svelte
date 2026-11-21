<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Virtualizer, observeElementOffset, observeElementRect, elementScroll,
    type VirtualItem,
  } from '@tanstack/virtual-core';
  import type { Readable } from 'svelte/store';

  interface Row {
    id: string;
    name: string;
    title: string;
    source: string;
    rarity: string;
    badges: { label: string; className?: string; title?: string }[];
    summary: () => string;
  }
  interface ListState {
    rows: Row[];
    selected: string | null;
    empty: string;
    newLabel: string;
    reveal: boolean;
  }

  let { state: model, viewport, onselect, initialOffset }:
    { state: Readable<ListState>; viewport: HTMLElement; onselect: (id: string) => void; initialOffset: number } = $props();

  let items: VirtualItem[] = $state([]);
  let total = $state(0);
  let active = $state<string | null>(null);
  const rowHeight = 51;
  const optionId = (id: string) => 'cd-option-' + id;
  const options = (rows: Row[]) => ({
    count: rows.length,
    getItemKey: (index: number) => rows[index].id,
    getScrollElement: () => viewport,
    estimateSize: () => rowHeight,
    initialOffset,
    overscan: 6,
    observeElementRect, observeElementOffset, scrollToFn: elementScroll,
    onChange: update,
  });
  const virtual = new Virtualizer<HTMLElement, HTMLButtonElement>(options([]));
  function update(instance: Virtualizer<HTMLElement, HTMLButtonElement>) {
    items = instance.getVirtualItems();
    total = instance.getTotalSize();
  }

  function keydown(event: KeyboardEvent) {
    const rows = listState.rows;
    const selected = rows.findIndex((row) => row.id === (active ?? listState.selected));
    const page = Math.max(1, Math.floor(viewport.clientHeight / rowHeight));
    let index: number;
    switch (event.key) {
      case 'ArrowDown': index = selected + 1; break;
      case 'ArrowUp': index = selected < 0 ? rows.length - 1 : selected - 1; break;
      case 'PageDown': index = selected + page; break;
      case 'PageUp': index = selected - page; break;
      case 'Home': index = 0; break;
      case 'End': index = rows.length - 1; break;
      case 'Enter':
      case ' ':
        if (selected >= 0) { event.preventDefault(); onselect(rows[selected].id); }
        return;
      default: return;
    }
    if (!rows.length) return;
    event.preventDefault();
    const next = Math.max(0, Math.min(rows.length - 1, index));
    active = rows[next].id;
    virtual.scrollToIndex(next);
  }

  let listState: ListState = $state.raw({ rows: [], selected: null, empty: '', newLabel: '', reveal: false });
  onMount(() => {
    const cleanup = virtual._didMount();
    viewport.addEventListener('keydown', keydown);
    const unsubscribe = model.subscribe((value) => {
      const previous = listState;
      listState = value;
      if (previous.rows !== value.rows) {
        virtual.setOptions(options(value.rows));
        virtual._willUpdate();
        update(virtual);
      }
      if (previous.selected !== value.selected || value.reveal) active = value.selected;
      if (value.reveal && value.selected) {
        const index = value.rows.findIndex((row) => row.id === value.selected);
        if (index >= 0) requestAnimationFrame(() => {
          if (viewport.isConnected && listState === value) virtual.scrollToIndex(index);
        });
      }
    });
    return () => {
      unsubscribe();
      cleanup();
      viewport.removeEventListener('keydown', keydown);
      viewport.removeAttribute('aria-activedescendant');
    };
  });

  $effect(() => {
    const current = active ?? listState.selected;
    if (current && items.some((item) => listState.rows[item.index]?.id === current)) {
      viewport.setAttribute('aria-activedescendant', optionId(current));
    } else viewport.removeAttribute('aria-activedescendant');
  });
</script>

{#if listState.empty === 'no-defaults'}
  <div class="empty-state">
    <b>Sem os padrões</b>
    <p>Na pasta do Vésper, rode: node tools/importar-cadastros.mjs</p>
    <p>Ou use “{listState.newLabel}”.</p>
  </div>
{:else if listState.rows.length === 0}
  <p class="empty">Nada encontrado com essa pesquisa.</p>
{:else}
  <div class="cd-virtual" role="presentation" style:height="{total}px">
    {#each items as item (item.key)}
      {@const row = listState.rows[item.index]}
      {#if row}
        <button
          type="button"
          class="cd-item"
          class:on={row.id === listState.selected}
          class:cd-active={row.id === active}
          role="option"
          tabindex="-1"
          id={optionId(row.id)}
          data-id={row.id}
          title={row.title}
          aria-selected={row.id === listState.selected}
          aria-posinset={item.index + 1}
          aria-setsize={listState.rows.length}
          style:transform="translateY({item.start}px)"
          onclick={() => { viewport.focus({ preventScroll: true }); onselect(row.id); }}
        >
          <span class="cd-item-top">
            <b class={row.rarity}>{row.name}</b>
            {#each row.badges as badge}
              <span class="badge {badge.className ?? ''}" title={badge.title}>{badge.label}</span>
            {/each}
            <span class="cd-src">{row.source}</span>
          </span>
          <span class="cd-item-sub">{row.summary()}</span>
        </button>
      {/if}
    {/each}
  </div>
{/if}
