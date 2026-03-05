<script lang="ts">
  import { auth, capitalizeWords, getRoleName, type FunctionArea } from '$lib/stores/auth';
  import type { UserInfo } from '$lib/stores/auth';

  let user: UserInfo | null = $state(null);
  let functions: FunctionArea[] = $state([]);
  let collapsed = $state(false);
  let mobileOpen = $state(false);

  auth.subscribe(value => {
    user = value.user;
    functions = value.functions;
  });

  // Load saved sidebar state
  if (typeof window !== 'undefined') {
    collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  }

  function toggleCollapse() {
    collapsed = !collapsed;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', String(collapsed));
    }
  }

  function toggleMobile() {
    mobileOpen = !mobileOpen;
  }

  function closeMobile() {
    mobileOpen = false;
  }

  async function handleLogout() {
    await auth.logout();
    window.location.href = '/login';
  }

  // Close mobile sidebar on navigation
  function handleNavClick() {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      closeMobile();
    }
  }

  function getFunctionIcon(name: string): string {
    const icons: Record<string, string> = {
      'Empresas': 'fa-building',
      'Trámites': 'fa-file-lines',
      'Tramites': 'fa-file-lines',
      'Usuarios': 'fa-users-cog',
      'Configuraciones': 'fa-gear',
      'Sectores': 'fa-layer-group',
      'Actividades Económicas': 'fa-briefcase',
      'Técnicos Ambientales': 'fa-user-tie',
      'Notificaciones': 'fa-bell',
      'Calendario': 'fa-calendar-days',
      'Tickets': 'fa-ticket',
      'Correspondencia': 'fa-envelope',
      'Inventario': 'fa-boxes-stacked',
      'Registros': 'fa-clipboard-list',
      'Solicitudes': 'fa-file-circle-question',
      'Viáticos': 'fa-money-bill-wave',
    };
    const key = Object.keys(icons).find(k => name.toLowerCase().includes(k.toLowerCase()));
    return key ? icons[key] : 'fa-circle';
  }
</script>

<!-- Mobile toggle button -->
<button class="mobile-toggle" onclick={toggleMobile} aria-label="Abrir menú">
  <i class="fas fa-bars"></i>
</button>

<!-- Overlay for mobile -->
{#if mobileOpen}
  <div class="sidebar-overlay" onclick={closeMobile} role="none"></div>
{/if}

<aside class="sidebar" class:collapsed class:open={mobileOpen}>
  <!-- User info header -->
  <div class="sidebar-header user-info">
    <div class="user-avatar">
      <i class="fas fa-user-circle"></i>
    </div>
    {#if !collapsed}
      <div class="user-meta">
        <div class="user-name">{user ? capitalizeWords(user.name) : 'Usuario'}</div>
        <div class="user-dept">{user ? getRoleName(user.rol) : 'Departamento'}</div>
      </div>
    {/if}
    <button class="sidebar-toggle" onclick={toggleCollapse} title="Colapsar/Expandir">
      <i class="fas fa-chevron-left"></i>
    </button>
  </div>

  <!-- Navigation -->
  <nav class="sidebar-nav">
    <div class="nav-section">
      {#if !collapsed}
        <div class="nav-section-title">Navegación</div>
      {/if}
      <ul class="nav-menu">
        <li class="nav-item">
          <a href="/main" class="nav-link" onclick={handleNavClick}>
            <i class="fas fa-home"></i>
            {#if !collapsed}<span>Inicio</span>{/if}
          </a>
        </li>
      </ul>
    </div>

    <!-- Dynamic functions -->
    <div class="nav-section">
      {#if !collapsed}
        <div class="nav-section-title">Funciones</div>
      {/if}
      <div class="sidebar-functions">
        {#each functions as area}
          {#if !collapsed}
            <div class="function-area-title">{area.area}</div>
          {/if}
          {#each area.items as func}
            {#if !(
              (user?.area === 5 || user?.area === 6) &&
              user?.puedeCrearUsuarios === false &&
              (func.name === 'Usuarios' || func.name === 'Usuarios Financieros')
            )}
              <a href={func.path} class="function-link" onclick={handleNavClick} title={func.name}>
                <i class="fas {getFunctionIcon(func.name)}"></i>
                {#if !collapsed}<span>{func.name}</span>{/if}
              </a>
            {/if}
          {/each}
        {/each}
      </div>
    </div>
  </nav>

  <!-- Footer / Logout -->
  <div class="sidebar-footer">
    <button class="logout-btn" onclick={handleLogout} title="Cerrar Sesión">
      <i class="fas fa-sign-out-alt"></i>
      {#if !collapsed}<span>Cerrar Sesión</span>{/if}
    </button>
  </div>
</aside>

<style>
  /* Mobile toggle */
  .mobile-toggle {
    display: none;
    position: fixed;
    top: 1rem;
    left: 1rem;
    z-index: 1100;
    background: #ffffff;
    color: var(--gray-600);
    border: 1px solid var(--gray-200);
    width: 40px;
    height: 40px;
    border-radius: 8px;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .sidebar-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 999;
  }

  /* Sidebar */
  .sidebar {
    width: 280px;
    background: #ffffff;
    color: #333;
    position: fixed;
    height: 100vh;
    display: flex;
    flex-direction: column;
    z-index: 1000;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.08);
    border-right: 1px solid #e9ecef;
    transition: width 0.3s ease;
  }

  .sidebar.collapsed {
    width: 70px;
  }

  .sidebar.collapsed .sidebar-toggle i {
    transform: rotate(180deg);
  }

  /* User info header */
  .sidebar-header.user-info {
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    display: flex;
    flex-direction: row;
    align-items: center;
    min-height: 80px;
    padding: 16px 50px 16px 20px;
    position: relative;
    gap: 12px;
    transition: min-height 0.3s ease, padding 0.3s ease;
  }

  .sidebar.collapsed .sidebar-header.user-info {
    min-height: 60px;
    padding: 12px 10px;
    justify-content: center;
  }

  .user-avatar {
    font-size: 2rem;
    color: var(--primary-color);
    flex-shrink: 0;
  }

  .user-meta {
    overflow: hidden;
  }

  .user-name {
    color: var(--gray-900);
    font-size: 0.9rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-dept {
    color: var(--gray-500);
    font-size: 0.75rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Toggle button */
  .sidebar-toggle {
    position: absolute;
    top: 50%;
    right: -13px;
    transform: translateY(-50%);
    background: #ffffff;
    color: var(--gray-500);
    border: 1px solid #e9ecef;
    width: 26px;
    height: 26px;
    border-radius: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: background 0.18s ease, color 0.18s ease;
    z-index: 1001;
  }

  .sidebar-toggle:hover {
    background: var(--gray-100);
    color: var(--primary-color);
  }

  .sidebar-toggle i {
    font-size: 11px;
    transition: transform 0.25s ease;
  }

  /* Navigation */
  .sidebar-nav {
    flex: 1;
    overflow-y: auto;
    padding: 20px 0;
  }

  .nav-section {
    margin-bottom: 24px;
  }

  .nav-section-title {
    font-size: 11px;
    font-weight: 600;
    color: #6c757d;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 0 20px 8px;
    margin-bottom: 8px;
    border-bottom: 1px solid #f1f3f4;
  }

  .nav-menu {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .nav-item {
    margin: 0;
  }

  .nav-link,
  .function-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    color: #495057;
    text-decoration: none;
    transition: all 0.2s ease;
    border-left: 3px solid transparent;
    font-size: 14px;
    font-weight: 500;
  }

  .nav-link:hover,
  .function-link:hover {
    background: #f8f9fa;
    color: var(--primary-color);
    border-left-color: var(--primary-color);
  }

  .nav-link i,
  .function-link i {
    font-size: 16px;
    width: 18px;
    text-align: center;
    opacity: 0.8;
  }

  .function-area-title {
    font-size: 0.7rem;
    font-weight: 600;
    color: #adb5bd;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 8px 20px 4px;
  }

  .sidebar.collapsed .nav-link,
  .sidebar.collapsed .function-link {
    justify-content: center;
    padding: 12px 0;
  }

  /* Footer */
  .sidebar-footer {
    padding: 20px;
    border-top: 1px solid #f1f3f4;
    margin-top: auto;
    background: #f8f9fa;
  }

  .logout-btn {
    width: 100%;
    padding: 10px 16px;
    background: transparent;
    color: var(--gray-600);
    border: 1px solid var(--gray-300);
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s ease;
  }

  .logout-btn:hover {
    background: #fdf2f2;
    color: #dc3545;
    border-color: #f5c6cb;
  }

  .sidebar.collapsed .logout-btn {
    padding: 8px 0;
  }

  .sidebar.collapsed .sidebar-footer {
    padding: 10px;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .mobile-toggle {
      display: flex;
    }

    .sidebar-overlay {
      display: block;
    }

    .sidebar {
      transform: translateX(-100%);
      transition: transform 0.3s ease;
    }

    .sidebar.open {
      transform: translateX(0);
    }
  }
</style>
