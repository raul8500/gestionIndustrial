<script lang="ts">
  interface Props {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }

  let { currentPage, totalPages, onPageChange }: Props = $props();

  function getPages(): (number | '...')[] {
    const pages: (number | '...')[] = [];
    const delta = 2;
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);

    if (left > 2) pages.push('...');

    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    if (right < totalPages - 1) pages.push('...');

    if (totalPages > 1) pages.push(totalPages);

    return pages;
  }
</script>

{#if totalPages > 1}
  <div class="pagination">
    <button
      disabled={currentPage <= 1}
      onclick={() => onPageChange(currentPage - 1)}
    >
      <i class="fas fa-chevron-left"></i>
    </button>

    {#each getPages() as page}
      {#if page === '...'}
        <span class="pagination-dots">...</span>
      {:else}
        <button
          class:active={page === currentPage}
          onclick={() => onPageChange(page as number)}
        >
          {page}
        </button>
      {/if}
    {/each}

    <button
      disabled={currentPage >= totalPages}
      onclick={() => onPageChange(currentPage + 1)}
    >
      <i class="fas fa-chevron-right"></i>
    </button>
  </div>
{/if}

<style>
  .pagination-dots {
    padding: 0.375rem 0.5rem;
    color: var(--gray-500);
    font-size: 0.875rem;
  }
</style>
