# Sidebar Simple - Sin Componentes EJS

## Descripción
Esta es la forma más simple de usar la sidebar en cualquier página. Solo necesitas copiar y pegar el código HTML y CSS.

## Archivos Necesarios

### 1. CSS
```html
<link rel="stylesheet" href="css/sidebar.css" />
```

### 2. JavaScript
```html
<script src="js/components/sidebar.js"></script>
```

## Código HTML para Copiar

### Estructura Básica con Nuevas Funcionalidades
```html
<div class="app-container">
  <!-- Sidebar -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <div class="logo-container">
        <img src="img/sedemalogo.png" alt="Logo SEDEMA" class="logo" />
        <h3 class="logo-text">SEDEMA</h3>
      </div>
      <button class="sidebar-toggle" id="sidebarToggle" title="Colapsar/Expandir">
        <i class="fas fa-chevron-left"></i>
      </button>
    </div>
    
    <nav class="sidebar-nav">
      <!-- Navegación principal -->
      <div class="nav-section">
        <div class="nav-section-title">Navegación</div>
        <ul class="nav-menu">
          <li class="nav-item">
            <a href="/main" class="nav-link">
              <i class="fas fa-home"></i>
              <span>Inicio</span>
            </a>
          </li>
          <!-- Agregar más enlaces aquí -->
        </ul>
      </div>

      <!-- Funciones del usuario (se cargan dinámicamente) -->
      <div class="nav-section" id="functions-section">
        <div class="nav-section-title">Funciones</div>
        <div id="sidebar-functions">
          <!-- Las funciones se cargarán aquí dinámicamente -->
        </div>
      </div>
    </nav>
    
    <div class="sidebar-footer">
      <div class="user-info">
        <i class="fas fa-cog"></i>
        <span>Sistema de Gestión</span>
      </div>
      <button class="logout-btn" id="logoutBtn" title="Cerrar Sesión">
        <i class="fas fa-sign-out-alt"></i>
        <span>Cerrar Sesión</span>
      </button>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="main-content">
    <!-- Top Bar -->
    <div class="top-bar">
      <button class="mobile-toggle" id="mobileToggle">
        <i class="fas fa-bars"></i>
      </button>
      
      <h1 class="page-title">Título de tu Página</h1>
      
      <div class="user-profile">
        <div class="user-details">
          <p class="user-name" id="name"></p>
          <p class="user-role" id="rol"></p>
        </div>
        <img id="profilePicture" src="" alt="Foto de perfil" class="profile-picture" />
      </div>
    </div>

    <!-- Content Area -->
    <div class="content-area">
      <div class="container-fluid">
        <!-- Aquí va el contenido de tu página -->
        <h2>Contenido de la Página</h2>
        <p>Tu contenido aquí...</p>
      </div>
    </div>
  </main>
</div>
```

## Nuevas Funcionalidades

### 1. Botón de Collapse/Expandir
- **Ubicación**: En la parte superior derecha del header de la sidebar
- **Funcionalidad**: Colapsa la sidebar a 70px de ancho
- **Persistencia**: El estado se guarda en localStorage y persiste al refrescar la página
- **Icono**: Flecha que rota según el estado

### 2. Botón de Cerrar Sesión
- **Ubicación**: En la parte inferior de la sidebar
- **Funcionalidad**: Cierra la sesión del usuario
- **Confirmación**: Pregunta antes de cerrar sesión
- **Redirección**: Envía al usuario a `/logout` que lo redirige a `/login`

### 3. Sidebar Colapsada
- **Ancho**: 70px cuando está colapsada
- **Elementos ocultos**: Textos, títulos y descripciones
- **Iconos visibles**: Solo se muestran los iconos
- **Transiciones suaves**: Animaciones de 0.3s

## Personalización por Página

### 1. Cambiar el Título
```html
<h1 class="page-title">Gestión de Usuarios</h1>
```

### 2. Cambiar la Navegación Activa
```html
<!-- Para la página de usuarios -->
<a href="/usuarios" class="nav-link active">
  <i class="fas fa-users"></i>
  <span>Usuarios</span>
</a>

<!-- Para la página de tickets -->
<a href="/tickets" class="nav-link active">
  <i class="fas fa-ticket-alt"></i>
  <span>Tickets</span>
</a>
```

### 3. Agregar Más Enlaces de Navegación
```html
<ul class="nav-menu">
  <li class="nav-item">
    <a href="/main" class="nav-link">
      <i class="fas fa-home"></i>
      <span>Inicio</span>
    </a>
  </li>
  <li class="nav-item">
    <a href="/usuarios" class="nav-link">
      <i class="fas fa-users"></i>
      <span>Usuarios</span>
    </a>
  </li>
  <li class="nav-item">
    <a href="/tickets" class="nav-link">
      <i class="fas fa-ticket-alt"></i>
      <span>Tickets</span>
    </a>
  </li>
</ul>
```

## Ejemplo para Página de Usuarios

```html
<% extraStyles=`<link rel="stylesheet" href="css/sidebar.css" />`; %>

<div class="app-container">
  <!-- Sidebar -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <div class="logo-container">
        <img src="img/sedemalogo.png" alt="Logo SEDEMA" class="logo" />
        <h3 class="logo-text">SEDEMA</h3>
      </div>
      <button class="sidebar-toggle" id="sidebarToggle" title="Colapsar/Expandir">
        <i class="fas fa-chevron-left"></i>
      </button>
    </div>
    
    <nav class="sidebar-nav">
      <div class="nav-section">
        <div class="nav-section-title">Navegación</div>
        <ul class="nav-menu">
          <li class="nav-item">
            <a href="/main" class="nav-link">
              <i class="fas fa-home"></i>
              <span>Inicio</span>
            </a>
          </li>
          <li class="nav-item">
            <a href="/usuarios" class="nav-link active">
              <i class="fas fa-users"></i>
              <span>Usuarios</span>
            </a>
          </li>
        </ul>
      </div>

      <div class="nav-section" id="functions-section">
        <div class="nav-section-title">Funciones</div>
        <div id="sidebar-functions">
          <!-- Las funciones se cargarán aquí dinámicamente -->
        </div>
      </div>
    </nav>
    
    <div class="sidebar-footer">
      <div class="user-info">
        <i class="fas fa-cog"></i>
        <span>Sistema de Gestión</span>
      </div>
      <button class="logout-btn" id="logoutBtn" title="Cerrar Sesión">
        <i class="fas fa-sign-out-alt"></i>
        <span>Cerrar Sesión</span>
      </button>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="main-content">
    <div class="top-bar">
      <button class="mobile-toggle" id="mobileToggle">
        <i class="fas fa-bars"></i>
      </button>
      
      <h1 class="page-title">Gestión de Usuarios</h1>
      
      <div class="user-profile">
        <div class="user-details">
          <p class="user-name" id="name"></p>
          <p class="user-role" id="rol"></p>
        </div>
        <img id="profilePicture" src="" alt="Foto de perfil" class="profile-picture" />
      </div>
    </div>

    <div class="content-area">
      <div class="container-fluid">
        <!-- Contenido específico de usuarios -->
        <h2>Lista de Usuarios</h2>
        <p>Aquí va tu contenido de usuarios...</p>
      </div>
    </div>
  </main>
</div>

<!-- Scripts -->
<script src="js/components/sidebar.js"></script>
```

## Ventajas de este Enfoque

- ✅ **Sin componentes EJS** - Solo HTML puro
- ✅ **Fácil de copiar y pegar** - No hay dependencias complejas
- ✅ **Personalización completa** - Cada página puede tener su propia navegación
- ✅ **Mantenimiento simple** - Cambios directos en el HTML
- ✅ **JavaScript reutilizable** - El archivo `sidebar.js` funciona en todas las páginas
- ✅ **Funcionalidad de collapse** - Sidebar se puede colapsar y expandir
- ✅ **Persistencia del estado** - El estado del collapse se mantiene al refrescar
- ✅ **Botón de logout** - Cierre de sesión integrado

## Funcionalidades Automáticas

- **Funciones dinámicas** se cargan automáticamente
- **Responsive design** funciona sin configuración
- **Toggle móvil** funciona automáticamente
- **Integración con main.js** es automática
- **Collapse/Expandir** con botón y persistencia
- **Logout** con confirmación y redirección
- **Transiciones suaves** en todos los elementos
