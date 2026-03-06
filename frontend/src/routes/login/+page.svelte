<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { auth } from '$lib/stores/auth';
  import { toast } from '$lib/stores/toast';
  import { onMount } from 'svelte';

  let username = $state('');
  let password = $state('');
  let loading = $state(false);
  let errorMessage = $state('');
  let deactivatedMessage = $state('');

  onMount(() => {
    const unsub = page.subscribe(p => {
      const reason = p.url.searchParams.get('reason');
      if (reason === 'deactivated') {
        deactivatedMessage = 'Tu cuenta ha sido desactivada por un administrador.';
        history.replaceState({}, '', '/login');
      } else if (reason === 'expired') {
        deactivatedMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
        history.replaceState({}, '', '/login');
      }
    });
    unsub();
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      errorMessage = 'Por favor, completa todos los campos.';
      return;
    }

    loading = true;
    errorMessage = '';

    try {
      const result = await auth.login(username, password);
      
      if (result.success) {
        toast.success('Inicio de sesión exitoso');
        setTimeout(() => goto('/main'), 1000);
      } else {
        errorMessage = result.error || 'Error al iniciar sesión';
      }
    } catch {
      errorMessage = 'Error en la comunicación con el servidor.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Login - SEDEMA 2025</title>
</svelte:head>

<div class="login-bg">
  <div class="login-card">
    <div class="login-logo">
      <img src="/img/sedemalogo.png" alt="Logo SEDEMA" />
    </div>

    <h1 class="login-title">Sistema Integral SEDEMA</h1>

    {#if deactivatedMessage}
      <div class="deactivated-banner">
        <i class="fas fa-user-slash"></i>
        <span>{deactivatedMessage}</span>
      </div>
    {/if}

    <p class="login-subtitle">
      <i class="fas fa-shield-alt"></i>
      Acceso seguro
    </p>

    <form class="login-form" onsubmit={handleSubmit}>
      <div class="input-group">
        <span class="input-icon">
          <i class="fas fa-user"></i>
        </span>
        <input
          type="text"
          class="form-input"
          placeholder="Nombre de usuario"
          bind:value={username}
          autocomplete="username"
          required
        />
      </div>

      <div class="input-group">
        <span class="input-icon">
          <i class="fas fa-lock"></i>
        </span>
        <input
          type="password"
          class="form-input"
          placeholder="Contraseña"
          bind:value={password}
          autocomplete="current-password"
          required
        />
      </div>

      {#if errorMessage}
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <span>{errorMessage}</span>
        </div>
      {/if}

      <button type="submit" class="btn btn-primary btn-lg login-button" disabled={loading}>
        {#if loading}
          <div class="spinner" style="width: 1.2rem; height: 1.2rem; border-width: 2px;"></div>
          Iniciando...
        {:else}
          <i class="fas fa-sign-in-alt"></i>
          Iniciar sesión
        {/if}
      </button>
    </form>

    <button class="forgot-password-btn" onclick={() => toast.info('¿Olvidaste tu contraseña?', 'Por favor comunícate con el equipo de TICs para restablecer tu acceso.')}>
      ¿Olvidaste tu contraseña?
    </button>

    <div class="login-footer">
      <p class="footer-text">
        <i class="fas fa-copyright"></i>
        Secretaría de Medio Ambiente Veracruz 2025. Todos los derechos reservados.
      </p>
    </div>
  </div>
</div>

<style>
  .deactivated-banner {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-left: 4px solid #dc2626;
    color: #991b1b;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    line-height: 1.4;
    margin-bottom: 0.5rem;
    animation: slideDown 0.3s ease-out;
  }

  .deactivated-banner i {
    font-size: 1.1rem;
    color: #dc2626;
    flex-shrink: 0;
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .login-bg {
    min-height: 100vh;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .login-card {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: var(--border-radius-xl);
    box-shadow: var(--shadow-lg);
    padding: 2.5rem 2rem;
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .login-logo {
    width: 120px;
    height: 120px;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .login-logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: var(--border-radius-lg);
  }

  .login-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary-color);
    margin: 0;
    text-align: center;
  }

  .login-subtitle {
    font-size: 1.125rem;
    color: var(--gray-600);
    margin: 0 0 0.5rem 0;
    text-align: center;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: center;
  }

  .login-subtitle i {
    color: var(--primary-color);
  }

  .login-form {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .input-group {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-icon {
    position: absolute;
    left: 0.75rem;
    color: var(--gray-400);
    font-size: 1rem;
    z-index: 1;
  }

  .input-group .form-input {
    padding-left: 2.5rem;
  }

  .error-message {
    background-color: rgb(239 68 68 / 0.1);
    color: var(--danger-color);
    padding: 0.75rem;
    border-radius: var(--border-radius);
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .login-button {
    width: 100%;
    margin-top: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    min-height: 2.75rem;
  }

  .forgot-password-btn {
    background: none;
    border: none;
    color: var(--primary-color);
    cursor: pointer;
    font-size: 0.875rem;
    padding: 0.25rem;
  }

  .forgot-password-btn:hover {
    text-decoration: underline;
  }

  .login-footer {
    width: 100%;
    border-top: 1px solid var(--gray-200);
    padding-top: 1rem;
    margin-top: 0.5rem;
    text-align: center;
  }

  .footer-text {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  @media (max-width: 480px) {
    .login-card {
      padding: 1.5rem 0.75rem;
      max-width: 95vw;
    }

    .login-logo {
      width: 80px;
      height: 80px;
    }

    .login-title {
      font-size: 1.125rem;
    }
  }
</style>
