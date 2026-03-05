<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import { getSocket, disconnectSocket } from '$lib/socket';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  let loading = $state(true);

  onMount(async () => {
    const ok = await auth.verifySession();
    if (!ok) {
      goto('/login');
    } else {
      loading = false;
      // Establish shared Socket.IO connection
      getSocket();
    }
  });

  onDestroy(() => {
    disconnectSocket();
  });
</script>

{#if loading}
  <div class="loading-overlay">
    <div class="spinner"></div>
    <p>Verificando sesión...</p>
  </div>
{:else}
  <div class="app-container">
    <Sidebar />
    <main class="main-content">
      <div class="content-area">
        {@render children()}
      </div>
    </main>
  </div>
{/if}

<style>
  .app-container {
    display: flex;
    min-height: 100vh;
  }

  .main-content {
    flex: 1;
    margin-left: 280px;
    transition: margin-left 0.3s ease;
    min-height: 100vh;
    background: transparent;
  }

  .content-area {
    padding: 2rem;
  }

  /* When sidebar is collapsed */
  :global(.sidebar.collapsed) ~ .main-content,
  :global(.sidebar.collapsed + .main-content) {
    margin-left: 70px;
  }

  @media (max-width: 768px) {
    .main-content {
      margin-left: 0;
    }

    .content-area {
      padding: 1rem;
      padding-top: 4rem;
    }
  }
</style>
