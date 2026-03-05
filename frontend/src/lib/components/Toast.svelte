<script lang="ts">
  import { toast, type Toast } from '$lib/stores/toast';

  let toasts: Toast[] = $state([]);

  toast.subscribe(value => {
    toasts = value;
  });
</script>

{#if toasts.length > 0}
  <div class="toast-container">
    {#each toasts as t (t.id)}
      <div class="toast toast-{t.type}">
        <div class="toast-icon">
          {#if t.type === 'success'}
            <i class="fas fa-check-circle"></i>
          {:else if t.type === 'error'}
            <i class="fas fa-exclamation-circle"></i>
          {:else if t.type === 'warning'}
            <i class="fas fa-exclamation-triangle"></i>
          {:else}
            <i class="fas fa-info-circle"></i>
          {/if}
        </div>
        <div class="toast-content">
          <strong>{t.title}</strong>
          {#if t.message}
            <p>{t.message}</p>
          {/if}
        </div>
        <button class="toast-close" onclick={() => toast.remove(t.id)}>
          <i class="fas fa-times"></i>
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 400px;
  }

  .toast {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideIn 0.3s ease;
    background: #fff;
    border-left: 4px solid;
  }

  .toast-success { border-left-color: #28a745; }
  .toast-error { border-left-color: #dc3545; }
  .toast-warning { border-left-color: #ffc107; }
  .toast-info { border-left-color: #17a2b8; }

  .toast-success .toast-icon { color: #28a745; }
  .toast-error .toast-icon { color: #dc3545; }
  .toast-warning .toast-icon { color: #ffc107; }
  .toast-info .toast-icon { color: #17a2b8; }

  .toast-icon {
    font-size: 1.25rem;
    line-height: 1;
    margin-top: 2px;
  }

  .toast-content {
    flex: 1;
  }

  .toast-content strong {
    display: block;
    font-size: 0.875rem;
    color: #212529;
  }

  .toast-content p {
    margin: 0.25rem 0 0;
    font-size: 0.8rem;
    color: #6c757d;
  }

  .toast-close {
    background: none;
    border: none;
    color: #adb5bd;
    cursor: pointer;
    padding: 0;
    font-size: 0.875rem;
  }

  .toast-close:hover {
    color: #495057;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
</style>
