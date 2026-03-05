<script lang="ts">
  import { auth, capitalizeWords, type FunctionArea } from '$lib/stores/auth';
  import type { UserInfo } from '$lib/stores/auth';

  let user: UserInfo | null = $state(null);
  let functions: FunctionArea[] = $state([]);

  auth.subscribe(value => {
    user = value.user;
    functions = value.functions;
  });

  function getCurrentDate(): string {
    return new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function getCurrentTime(): string {
    return new Date().toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  let currentTime = $state(getCurrentTime());

  $effect(() => {
    const interval = setInterval(() => {
      currentTime = getCurrentTime();
    }, 1000);
    return () => clearInterval(interval);
  });
</script>

<svelte:head>
  <title>Panel Principal - SEDEMA</title>
</svelte:head>

<div class="main-dashboard">
  <!-- System info -->
  <div class="system-info">
    <div class="main-logo">
      <img src="/img/sedemalogo.png" alt="Logo SEDEMA" />
    </div>
    <h3 class="system-title">SIS Sistema Integral SEDEMA</h3>
    <div class="datetime-info">
      <div class="current-date">{getCurrentDate()}</div>
      <div class="current-time">{currentTime}</div>
    </div>
  </div>

  <!-- Function cards -->
  <div id="contenedor-funciones">
    {#if functions.length === 0}
      <div class="empty-state">
        <i class="fas fa-info-circle"></i>
        <h4>No tienes funciones asignadas</h4>
        <p>Contacta al administrador para que te asigne las funciones correspondientes.</p>
      </div>
    {:else}
      {#each functions as area}
        <div class="area-section">
          <div class="area-header">
            <i class="fas fa-layer-group"></i>
            <h4>{area.area || 'Sin área definida'}</h4>
          </div>
          <div class="functions-grid">
            {#each area.items as func}
              {#if !(
                (user?.area === 5 || user?.area === 6) &&
                user?.puedeCrearUsuarios === false &&
                (func.name === 'Usuarios' || func.name === 'Usuarios Financieros')
              )}
                <div class="function-card card">
                  <div class="card-body">
                    <h4 class="card-title">{func.name}</h4>
                    <p class="card-text">
                      {func.description || 'Accede y gestiona esta sección del sistema.'}
                    </p>
                    <a href={func.path} class="btn btn-primary">Entrar</a>
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .main-dashboard {
    max-width: 1200px;
    margin: 0 auto;
  }

  .system-info {
    text-align: center;
    padding: 2rem 0;
    margin-bottom: 2rem;
  }

  .main-logo {
    width: 100px;
    height: 100px;
    margin: 0 auto 1rem;
  }

  .main-logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .system-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--gray-900);
    margin-bottom: 0.5rem;
  }

  .datetime-info {
    color: var(--gray-500);
    font-size: 0.95rem;
  }

  .current-time {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--primary-color);
    margin-top: 0.25rem;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--gray-500);
  }

  .empty-state i {
    font-size: 3rem;
    margin-bottom: 1rem;
    display: block;
  }

  .empty-state h4 {
    color: var(--gray-600);
    margin-bottom: 0.5rem;
  }

  .area-section {
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 1rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: var(--shadow-sm);
  }

  .area-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .area-header i {
    font-size: 1.5rem;
    color: var(--primary-color);
  }

  .area-header h4 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--gray-900);
    margin: 0;
  }

  .functions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }

  .function-card {
    position: relative;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .function-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  .function-card .card-title {
    color: var(--gray-900);
    font-size: 1rem;
  }

  .function-card .card-text {
    font-size: 0.8rem;
    color: var(--gray-600);
    margin-bottom: 1rem;
  }

  @media (max-width: 768px) {
    .functions-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
