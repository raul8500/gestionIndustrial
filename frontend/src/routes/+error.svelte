<svelte:head>
  <title>404 - Página no encontrada - SEDEMA</title>
</svelte:head>

<div class="error-page">
  <div class="error-content">
    <h1 class="error-code">404</h1>
    <h2 class="error-title">Página no encontrada</h2>
    <p class="error-message">La página que buscas no existe o fue movida.</p>
    <a href="/main" class="btn btn-primary btn-lg">
      <i class="fas fa-home"></i> Volver al inicio
    </a>
  </div>
</div>

<style>
  .error-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gray-50);
    padding: 2rem;
  }

  .error-content {
    text-align: center;
    max-width: 500px;
  }

  .error-code {
    font-size: 6rem;
    font-weight: 800;
    color: var(--primary-color);
    line-height: 1;
    margin-bottom: 0.5rem;
  }

  .error-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--gray-900);
    margin-bottom: 0.75rem;
  }

  .error-message {
    color: var(--gray-500);
    margin-bottom: 2rem;
  }
</style>
