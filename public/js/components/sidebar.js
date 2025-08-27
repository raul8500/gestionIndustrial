/**
 * Componente Sidebar - Reutilizable para todas las páginas
 * Maneja la navegación, funciones del usuario y responsive design
 */

class Sidebar {
  constructor() {
    this.infoUser = null;
    this.sidebarElement = null;
    this.mobileToggle = null;
    this.sidebarFunctions = null;
    this.logoutBtn = null;
    
    this.init();
  }

  init() {
    this.sidebarElement = document.getElementById('sidebar');
    this.mobileToggle = document.getElementById('mobileToggle');
    this.sidebarFunctions = document.getElementById('sidebar-functions');
    this.sidebarToggle = document.getElementById('sidebarToggle');
    this.logoutBtn = document.getElementById('logoutBtn');
    this.appContainer = document.querySelector('.app-container');
    
    if (this.sidebarElement) {
      this.setupEventListeners();
      this.interceptMainFunctions();
      this.loadSidebarState();
      this.startDateTimeUpdate();
      console.log('Sidebar inicializada correctamente');
    } else {
      console.warn('Elemento sidebar no encontrado');
    }
  }

  setupEventListeners() {
    // Toggle sidebar en móviles
    if (this.mobileToggle) {
      this.mobileToggle.addEventListener('click', () => {
        this.toggleMobileSidebar();
      });
    }

    // Toggle sidebar collapse
    if (this.sidebarToggle) {
      this.sidebarToggle.addEventListener('click', () => {
        this.toggleSidebarCollapse();
      });
    }

    // Botón de logout
    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', () => {
        this.handleLogout();
      });
    }

    // Cerrar sidebar al hacer clic fuera en móviles
    document.addEventListener('click', (event) => {
      if (window.innerWidth <= 768) {
        if (!this.sidebarElement.contains(event.target) && 
            !this.mobileToggle.contains(event.target)) {
          this.closeMobileSidebar();
        }
      }
    });

    // Manejar cambios de tamaño de ventana
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        this.closeMobileSidebar();
      }
    });
  }

  toggleMobileSidebar() {
    this.sidebarElement.classList.toggle('open');
  }

  closeMobileSidebar() {
    this.sidebarElement.classList.remove('open');
  }

  toggleSidebarCollapse() {
    const isCollapsed = this.sidebarElement.classList.contains('collapsed');
    
    if (isCollapsed) {
      this.expandSidebar();
    } else {
      this.collapseSidebar();
    }
    
    // Guardar estado en localStorage
    localStorage.setItem('sidebarCollapsed', !isCollapsed);
  }

  collapseSidebar() {
    this.sidebarElement.classList.add('collapsed');
    this.appContainer.classList.add('sidebar-collapsed');
  }

  expandSidebar() {
    this.sidebarElement.classList.remove('collapsed');
    this.appContainer.classList.remove('sidebar-collapsed');
  }

  loadSidebarState() {
    // Cargar estado del sidebar desde localStorage
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    
    if (isCollapsed) {
      this.collapseSidebar();
    }
  }

  startDateTimeUpdate() {
    // Actualizar fecha y hora inmediatamente
    this.updateDateTime();
    
    // Actualizar cada segundo
    setInterval(() => {
      this.updateDateTime();
    }, 1000);
  }

  updateDateTime() {
    const now = new Date();
    
    // Formatear fecha
    const dateOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const currentDate = now.toLocaleDateString('es-ES', dateOptions);
    
    // Formatear hora
    const currentTime = now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    // Actualizar elementos en el DOM
    const dateElement = document.getElementById('currentDate');
    const timeElement = document.getElementById('currentTime');
    
    if (dateElement) dateElement.textContent = currentDate;
    if (timeElement) timeElement.textContent = currentTime;
  }

  handleLogout() {
    // Limpiar localStorage
    localStorage.clear();
    
    // Redirigir a la página de logout
    window.location.href = '/logout';
  }

  interceptMainFunctions() {
    // Interceptar la función mostrarRolUsuario para obtener infoUser
    this.interceptFunction('mostrarRolUsuario', (originalFn, data) => {
      this.infoUser = data;
      return originalFn(data);
    });

    // Interceptar la función renderizarFuncionesEnCards
    this.interceptFunction('renderizarFuncionesEnCards', (originalFn, data) => {
      // Llamar a la función original si existe
      if (originalFn) {
        originalFn(data);
      }
      
      // Actualizar la sidebar
      this.renderizarFuncionesEnSidebar(data);
    });
  }

  interceptFunction(functionName, interceptor) {
    const originalFn = window[functionName];
    
    if (originalFn) {
      window[functionName] = function(...args) {
        return interceptor(originalFn, ...args);
      };
    } else {
      // Si la función no existe, crear una versión que funcione
      window[functionName] = function(...args) {
        return interceptor(null, ...args);
      };
    }
  }

  renderizarFuncionesEnSidebar(functions) {
    if (!this.sidebarFunctions) {
      console.log('❌ Elemento sidebar-functions no encontrado');
      return;
    }

    console.log('🎨 Renderizando sidebar con funciones:', functions);
    
    // Si no hay funciones, mostrar mensaje
    if (!Array.isArray(functions) || functions.length === 0) {
      this.sidebarFunctions.innerHTML = `
        <div class="text-center p-3">
          <i class="fas fa-info-circle text-muted mb-2"></i>
          <p class="text-muted small mb-0">Sin funciones asignadas</p>
        </div>
      `;
      return;
    }
    
    // Crear HTML simple y directo
    let html = '';
    
    // Agregar funciones del usuario (sin indicador visual)
    functions.forEach(area => {
      if (area.items && Array.isArray(area.items)) {
        area.items.forEach(func => {
          // Verificar si se debe ocultar
          if (this.shouldHideFunction(func)) {
            return;
          }
          
          const icon = this.obtenerIconoPorNombre(func.name);
          html += `
            <div class="function-item">
              <a href="${func.path}" class="function-link">
                <i class="fas ${icon} function-icon"></i>
                <span>${func.name}</span>
              </a>
            </div>
          `;
        });
      }
    });
    
    // Si no hay funciones después del filtrado, mostrar mensaje
    if (html === '') {
      this.sidebarFunctions.innerHTML = `
        <div class="text-center p-3">
          <i class="fas fa-info-circle text-muted mb-2"></i>
          <p class="text-muted small mb-0">Sin funciones disponibles</p>
        </div>
      `;
      return;
    }
    
    // Aplicar HTML
    this.sidebarFunctions.innerHTML = html;
    console.log('✅ Sidebar renderizada:', html);
  }
  
  shouldHideFunction(func) {
    // Ocultar si es del área 5 o 6 y no puede crear usuarios, y el item se llama "Usuarios" o "Usuarios Financieros"
    if (
      this.infoUser && 
      (this.infoUser.area === 5 || this.infoUser.area === 6) &&
      this.infoUser.puedeCrearUsuarios === false &&
      (func.name === 'Usuarios' || func.name === 'Usuarios financieros')
    ) {
      return true;
    }
    return false;
  }

  getPageTitle() {
    const path = window.location.pathname;
    const titles = {
      '/main': 'Panel Principal',
      '/registros': 'Registro de Oficios', // Corregido: era /oficios, ahora es /registros
      '/financieros/correspondencia': 'Correspondencia Financieros',
      '/financieros/usuarios': 'Usuarios Financieros',
      '/financieros/viaticos': 'Viáticos',
      '/usuariosGestionAmbiental': 'Usuarios Gestión Ambiental',
      '/inventariotics': 'Inventario TICS',
      '/secretaria/correspondencia': 'Correspondencia Secretaría',
      '/tickets': 'Tickets'
    };
    return titles[path] || '';
  }

  obtenerIconoPorNombre(nombre) {
    const iconos = {
      'Usuarios': 'fa-users',
      'Correspondencia': 'fa-file-alt',
      'Tickets': 'fa-ticket-alt',
      'Inventario': 'fa-boxes',
      'Oficios': 'fa-file-signature',
      'Financieros': 'fa-dollar-sign',
      'Usuarios financieros': 'fa-user-tie',
      'Usuarios Gestión Ambiental': 'fa-leaf',
      'Viáticos': 'fa-receipt',
      'default': 'fa-cog'
    };

    for (const [key, icono] of Object.entries(iconos)) {
      if (nombre.toLowerCase().includes(key.toLowerCase())) {
        return icono;
      }
    }
    return iconos.default;
  }

  // Método para actualizar el usuario activo en la navegación
  updateActiveNavigation(currentPath) {
    const navLinks = this.sidebarElement.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === currentPath) {
        link.classList.add('active');
      }
    });
  }
}

// Inicializar la sidebar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.sidebar = new Sidebar();
});

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Sidebar;
}
