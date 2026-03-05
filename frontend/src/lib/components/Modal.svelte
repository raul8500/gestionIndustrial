<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    title?: string;
    size?: 'default' | 'lg';
    onclose: () => void;
    children: Snippet;
    footer?: Snippet;
  }

  let { open, title = '', size = 'default', onclose, children, footer }: Props = $props();

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onclose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="modal-backdrop" onclick={handleBackdropClick} role="dialog" aria-modal="true">
    <div class="modal" class:modal-lg={size === 'lg'}>
      <div class="modal-header">
        <h3>{title}</h3>
        <button class="modal-close" onclick={onclose} aria-label="Cerrar">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        {@render children()}
      </div>
      {#if footer}
        <div class="modal-footer">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}
