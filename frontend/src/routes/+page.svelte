<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth';

  onMount(async () => {
    const ok = await auth.verifySession();
    if (ok) {
      goto('/main');
    } else {
      goto('/login');
    }
  });
</script>

<div class="loading-overlay">
  <div class="spinner"></div>
  <p>Cargando...</p>
</div>
