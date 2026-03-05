<svelte:head>
  <title>Configuraciones - Gestión Ambiental - SEDEMA</title>
</svelte:head>

<div class="page-header-card">
<div class="page-header">
  <h1><i class="fas fa-cog"></i> Configuraciones de Gestión Ambiental</h1>
</div>
</div>

<div class="config-grid">
  <a href="/gestionambientaltiposempresa" class="config-card card">
    <div class="card-body">
      <div class="config-icon">
        <i class="fas fa-tags"></i>
      </div>
      <h4 class="card-title">Tipos de Empresa</h4>
      <p class="card-text">Administra el catálogo de tipos de empresa para clasificación.</p>
      <span class="config-link">
        Gestionar <i class="fas fa-arrow-right"></i>
      </span>
    </div>
  </a>

  <a href="/gestionambientaltecnicosambientales" class="config-card card">
    <div class="card-body">
      <div class="config-icon">
        <i class="fas fa-user-tie"></i>
      </div>
      <h4 class="card-title">Técnicos Ambientales</h4>
      <p class="card-text">Administra el catálogo de técnicos ambientales disponibles.</p>
      <span class="config-link">
        Gestionar <i class="fas fa-arrow-right"></i>
      </span>
    </div>
  </a>
</div>

<style>
  .config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
    max-width: 800px;
  }

  .config-card {
    text-decoration: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .config-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }

  .config-icon {
    width: 50px;
    height: 50px;
    background: var(--primary-light);
    color: var(--primary-color);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }

  .config-card .card-title {
    color: var(--gray-900);
  }

  .config-card .card-text {
    margin-bottom: 1rem;
  }

  .config-link {
    color: var(--primary-color);
    font-weight: 500;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
