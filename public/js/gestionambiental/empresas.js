// Configuración global
let currentPage = 1;
let currentLimit = 10;
let currentFilters = {
  orden: 'normal',
  busqueda: '',
  status: ''
};

// Elementos del DOM
const elements = {
  table: document.getElementById('tablaEmpresas'),
  tbody: document.querySelector('#tablaEmpresas tbody'),
  loadingIndicator: document.getElementById('loadingIndicator'),
  tableContent: document.getElementById('tableContent'),
  noResults: document.getElementById('noResults'),
  pagination: document.getElementById('pagination'),
  limitSelect: document.getElementById('limitSelect'),
  searchInput: document.getElementById('searchInput'),
  filterStatus: document.getElementById('filterStatus'),
  btnAplicarFiltros: document.getElementById('btnAplicarFiltros'),
  btnLimpiarFiltros: document.getElementById('btnLimpiarFiltros'),
  ordenNormal: document.getElementById('ordenNormal'),
  ordenReciente: document.getElementById('ordenReciente'),
  ordenAntiguo: document.getElementById('ordenAntiguo')
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM cargado, inicializando módulo de empresas...');
  
  // Verificar que los elementos de estadísticas existan
  const statsElements = [
    'totalEmpresas',
    'empresasActivas'
  ];
  
  console.log('Verificando elementos de estadísticas:');
  statsElements.forEach(id => {
    const element = document.getElementById(id);
    console.log(`${id}:`, element ? 'Encontrado' : 'NO ENCONTRADO');
  });
  
  const hasUI = !!document.getElementById('tablaEmpresas');
  if (hasUI) {
    initializeEventListeners();
    loadEmpresas();
    // Cargar catálogo de Tipos de Empresa para selects
    cargarTiposEmpresa();
  } else {
    console.warn('UI de empresas no encontrada en esta página. Se omite la inicialización de tabla/listeners.');
  }
  loadStats();
  
  // Limpiar cualquier padding residual al cargar la página
  setTimeout(() => {
    cleanModalBodyPadding();
  }, 500);
  
  // Prevenir cambios de layout desde el inicio
  preventLayoutChanges();
});

// Event Listeners
function initializeEventListeners() {
  // Helper para agregar listeners de forma segura
  const safeAdd = (el, type, handler) => {
    if (el && typeof el.addEventListener === 'function') {
      el.addEventListener(type, handler);
    }
  };
  // Filtros
  safeAdd(elements.btnAplicarFiltros, 'click', applyFilters);
  safeAdd(elements.btnLimpiarFiltros, 'click', clearFilters);
  
  // Búsqueda en tiempo real
  safeAdd(elements.searchInput, 'input', debounce(handleSearch, 500));
  
  // Cambio de límite por página
  safeAdd(elements.limitSelect, 'change', handleLimitChange);
  
  // Ordenamiento - usar múltiples eventos para asegurar que funcione
  [elements.ordenNormal, elements.ordenReciente, elements.ordenAntiguo]
    .filter(Boolean)
    .forEach(radio => {
      safeAdd(radio, 'change', handleOrderChange);
      safeAdd(radio, 'click', handleOrderChange);
      safeAdd(radio, 'input', handleOrderChange);
    });
  
  // Event listener específico para Bootstrap btn-check
  document.addEventListener('change', function(event) {
    if (event.target.name === 'ordenEmpresas' || 
        event.target.id === 'ordenNormal' || 
        event.target.id === 'ordenReciente' || 
        event.target.id === 'ordenAntiguo') {
      console.log('Cambio detectado globalmente en:', event.target.id, 'name:', event.target.name);
      handleOrderChange(event);
    }
  });
  
  // Event listener adicional para el evento 'click' en los labels
  document.querySelectorAll('label[for^="orden"]').forEach(label => {
    label.addEventListener('click', function() {
      const targetId = this.getAttribute('for');
      console.log('Label clickeado para:', targetId);
      // Pequeño delay para que el radio button se marque
      setTimeout(() => {
        handleOrderChange({ type: 'label-click', target: { id: targetId } });
      }, 100);
    });
  });
  
  // Debug: verificar que los elementos existen
  console.log('Elementos de ordenamiento encontrados:');
  console.log('Normal:', elements.ordenNormal, 'checked:', elements.ordenNormal?.checked);
  console.log('Reciente:', elements.ordenReciente?.checked, 'ID:', elements.ordenReciente?.id);
  console.log('Antiguo:', elements.ordenAntiguo, 'checked:', elements.ordenAntiguo?.checked);
  
  // Verificar también los atributos
  if (elements.ordenNormal) {
    console.log('Atributos del radio Normal:', {
      id: elements.ordenNormal.id,
      name: elements.ordenNormal.name,
      value: elements.ordenNormal.value,
      checked: elements.ordenNormal.checked,
      class: elements.ordenNormal.className
    });
  }
  
     // Filtros individuales
  safeAdd(elements.filterStatus, 'change', handleFilterChange);
  
  // Botón de nueva empresa
  const btnNuevaEmpresa = document.getElementById('btnNuevaEmpresa');
  if (btnNuevaEmpresa) {
    btnNuevaEmpresa.addEventListener('click', function() {
      console.log('Botón nueva empresa clickeado');
      resetModal();
      // Abrir modal manualmente si es necesario
      const modal = document.getElementById('modalEmpresa');
      if (modal) {
        try {
          openModalWithoutLayoutChange(modal);
        } catch (error) {
          console.error('Error al abrir modal con Bootstrap:', error);
          // Fallback: mostrar modal manualmente sin afectar layout
          modal.style.display = 'block';
          modal.classList.add('show');
          // No agregar modal-open al body para evitar cambios
        }
      }
    });
  } else {
    console.error('Botón nueva empresa no encontrado');
  }
  
  // Event listener adicional para el modal
  const modal = document.getElementById('modalEmpresa');
  if (modal) {
    modal.addEventListener('hidden.bs.modal', function() {
      console.log('Modal cerrado, reseteando...');
      resetModal();
      // Limpiar padding del body inmediatamente después de cerrar
      setTimeout(() => {
        cleanModalBodyPadding();
      }, 100);
    });
    
    // Event listener para cuando se abre el modal
    modal.addEventListener('shown.bs.modal', function() {
      console.log('Modal abierto');
      // Enfocar el primer campo
      const firstField = modal.querySelector('input, select, textarea');
      if (firstField) {
        firstField.focus();
      }
    });
    
    // Event listener adicional para cuando se cierra el modal con el botón X o fuera del modal
    modal.addEventListener('click', function(event) {
      if (event.target === modal || event.target.classList.contains('btn-close')) {
        // Si se hace clic fuera del modal o en el botón de cerrar
        setTimeout(() => {
          cleanModalBodyPadding();
        }, 100);
      }
    });
    
    // Event listener para el backdrop
    modal.addEventListener('click', function(event) {
      if (event.target === modal) {
        // Si se hace clic en el backdrop, cerrar el modal
        const bootstrapModal = bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
          bootstrapModal.hide();
        }
      }
    });
  }
  
  // Event listener global para limpiar padding cuando se cierra cualquier modal
  document.addEventListener('click', function(event) {
    // Si se hace clic en un botón que cierra el modal
    if (event.target.classList.contains('btn-close') || 
        event.target.classList.contains('btn-secondary') ||
        event.target.getAttribute('data-bs-dismiss') === 'modal') {
      setTimeout(() => {
        cleanModalBodyPadding();
      }, 150);
    }
  });
  
  // Event listener para la tecla Escape
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      setTimeout(() => {
        cleanModalBodyPadding();
      }, 150);
    }
  });
}

// Cargar empresas con paginación
async function loadEmpresas(page = 1) {
  try {
    showLoading();
    
    // Debug: mostrar los filtros actuales
    console.log('Filtros actuales:', currentFilters);
    console.log('Orden seleccionado:', currentFilters.orden);
    
         const queryParams = new URLSearchParams({
       pagina: page,
       limite: currentLimit,
       orden: currentFilters.orden,
       busqueda: currentFilters.busqueda,
       status: currentFilters.status
     });
    
    const url = `/api/gestionambiental/empresas?${queryParams}`;
    console.log('URL de la petición:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log('Datos recibidos:', data);
      console.log('Primer empresa para debugging:', data.empresas[0]);
      if (data.empresas[0]) {
        console.log('Campos del primer empresa:', Object.keys(data.empresas[0]));
      }
      renderEmpresas(data.empresas);
      renderPagination(data.paginacion);
      currentPage = page;
    } else {
      throw new Error(data.message || 'Error al cargar empresas');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Error al cargar las empresas');
  } finally {
    hideLoading();
  }
}

// Renderizar empresas en la tabla
function renderEmpresas(empresas) {
  if (!empresas || empresas.length === 0) {
    showNoResults();
    return;
  }
  
  elements.tbody.innerHTML = '';
  
  empresas.forEach((empresa, index) => {
    // Debug: mostrar la empresa de cada empresa
    console.log(`Empresa ${empresa.codigo}: razonSocial = "${empresa.razonSocial}" (tipo: ${typeof empresa.razonSocial})`);
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="text-center">
        <div class="fw-bold text-info" title="${empresa.codigo || '-'}">
          ${empresa.codigo || '-'}
        </div>
      </td>
      <td>
        <div class="text-truncate" title="${empresa.razonSocial || '-'}">
          ${empresa.razonSocial || '-'}
        </div>
      </td>
      <td class="text-center">
        <code class="bg-light px-2 py-1 rounded">${empresa.rfc || '-'}</code>
      </td>
      <td class="text-center">
        <small class="text-muted">${empresa.telefono || '-'}</small>
      </td>
      <td class="text-center">
        ${getStatusBadge(empresa.status)}
      </td>
      <td class="text-center">
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-info btn-sm" onclick="verEmpresa('${empresa._id}')" title="Ver Empresa">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-outline-warning btn-sm" onclick="editarEmpresa('${empresa._id}')" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-outline-danger btn-sm" onclick="eliminarEmpresa('${empresa._id}')" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    elements.tbody.appendChild(row);
  });
  
  showTableContent();
}

// Renderizar paginación
function renderPagination(paginacion) {
  if (!paginacion || paginacion.totalPaginas <= 1) {
    elements.pagination.innerHTML = '';
    return;
  }
  
  const { pagina, totalPaginas, tieneSiguiente, tieneAnterior } = paginacion;
  
  let paginationHTML = '';
  
  // Botón anterior
  if (tieneAnterior) {
    paginationHTML += `
      <li class="page-item">
        <a class="page-link" href="#" onclick="changePage(${pagina - 1})">
          <i class="fas fa-chevron-left"></i>
        </a>
      </li>
    `;
  }
  
  // Números de página
  const startPage = Math.max(1, pagina - 2);
  const endPage = Math.min(totalPaginas, pagina + 2);
  
  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <li class="page-item ${i === pagina ? 'active' : ''}">
        <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
      </li>
    `;
  }
  
  // Botón siguiente
  if (tieneSiguiente) {
    paginationHTML += `
      <li class="page-item">
        <a class="page-link" href="#" onclick="changePage(${pagina + 1})">
          <i class="fas fa-chevron-right"></i>
        </a>
      </li>
    `;
  }
  
  elements.pagination.innerHTML = paginationHTML;
}

// Cambiar página
function changePage(page) {
  currentPage = page;
  loadEmpresas(page);
}

// Aplicar filtros
function applyFilters() {
  const newFilters = {
    orden: getSelectedOrder(),
    busqueda: elements.searchInput.value.trim(),
    status: elements.filterStatus.value
  };
  
  console.log('Aplicando filtros:', newFilters);
  
  currentFilters = newFilters;
  currentPage = 1; // Reset a primera página
  loadEmpresas(1);
}

// Limpiar filtros
function clearFilters() {
  elements.searchInput.value = '';
  elements.filterStatus.value = '';
  
  currentFilters = {
    orden: 'normal',
    busqueda: '',
    status: ''
  };
  
  // Reset ordenamiento
  elements.ordenNormal.checked = true;
  
  currentPage = 1;
  loadEmpresas(1);
}

// Obtener orden seleccionado
function getSelectedOrder() {
  // Verificar que los elementos existan
  if (!elements.ordenNormal || !elements.ordenReciente || !elements.ordenAntiguo) {
    console.error('Error: No se encontraron los elementos de ordenamiento');
    return 'normal';
  }
  
  console.log('Estado de los radio buttons:');
  console.log('Normal:', elements.ordenNormal.checked, 'ID:', elements.ordenNormal.id);
  console.log('Reciente:', elements.ordenNormal.checked, 'ID:', elements.ordenReciente.id);
  console.log('Antiguo:', elements.ordenAntiguo.checked, 'ID:', elements.ordenAntiguo.id);
  
  // Verificar también el atributo value
  console.log('Valores de los radio buttons:');
  console.log('Normal value:', elements.ordenNormal.value);
  console.log('Reciente value:', elements.ordenReciente.value);
  console.log('Antiguo value:', elements.ordenAntiguo.value);
  
  if (elements.ordenReciente.checked) {
    console.log('Orden seleccionado: reciente');
    return 'reciente';
  }
  if (elements.ordenAntiguo.checked) {
    console.log('Orden seleccionado: antiguo');
    return 'antiguo';
  }
  
  console.log('Orden seleccionado: normal');
  return 'normal';
}

// Manejadores de eventos
function handleSearch() {
  currentFilters.busqueda = elements.searchInput.value.trim();
  currentPage = 1;
  loadEmpresas(1);
}

function handleLimitChange() {
  currentLimit = parseInt(elements.limitSelect.value);
  currentPage = 1;
  loadEmpresas(1);
}

function handleOrderChange(event) {
  console.log('handleOrderChange llamado con evento:', event.type, 'target:', event.target?.id);
  
  // Pequeño delay para asegurar que el radio button se marque (especialmente para Bootstrap)
  setTimeout(() => {
    const newOrder = getSelectedOrder();
    console.log('Cambio de ordenamiento detectado:', newOrder);
    console.log('Evento que disparó el cambio:', event.type);
    
    if (newOrder !== currentFilters.orden) {
      currentFilters.orden = newOrder;
      currentPage = 1;
      
      console.log('Filtros actualizados:', currentFilters);
      loadEmpresas(1);
    } else {
      console.log('No hubo cambio real en el ordenamiento');
    }
  }, 150); // Aumentar el delay para Bootstrap
}

function handleFilterChange() {
  // Los filtros se aplican cuando se presiona el botón "Aplicar Filtros"
}

// Cargar estadísticas
async function loadStats() {
  try {
    console.log('Cargando estadísticas...');
    const response = await fetch('/api/gestionambiental/empresas/estadisticas');
    const data = await response.json();
    
    console.log('Respuesta de estadísticas:', data);
    console.log('Status de la respuesta:', response.status);
    
    if (response.ok && data) {
      console.log('Estadísticas recibidas:', data);
      updateStats(data);
    } else {
      console.error('Error en la respuesta de estadísticas:', data);
    }
  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
  }
}

// Actualizar estadísticas en la UI
function updateStats(stats) {
  console.log('Actualizando estadísticas en la UI:', stats);
  
  // Verificar que los elementos existan antes de actualizarlos
  const elements = {
    totalEmpresas: document.getElementById('totalEmpresas'),
    empresasActivas: document.getElementById('empresasActivas')
  };
  
  // Actualizar cada elemento si existe
  if (elements.totalEmpresas) {
    elements.totalEmpresas.textContent = stats.totalEmpresas || 0;
    console.log('Total actualizado:', stats.totalEmpresas || 0);
  }
  
  if (elements.empresasActivas) {
    elements.empresasActivas.textContent = stats.empresasActivas || 0;
    console.log('Activas actualizadas:', stats.empresasActivas || 0);
  }
  

}

// Estados de la UI
function showLoading() {
  elements.loadingIndicator.style.display = 'block';
  elements.tableContent.style.display = 'none';
  elements.noResults.style.display = 'none';
}

function hideLoading() {
  elements.loadingIndicator.style.display = 'none';
}

function showTableContent() {
  elements.tableContent.style.display = 'block';
  elements.noResults.style.display = 'none';
}

function showNoResults() {
  elements.tableContent.style.display = 'none';
  elements.noResults.style.display = 'block';
}

function showError(message) {
  // Implementar notificación de error
  console.error(message);
}

// Utilidades
// Cargar Tipos de Empresa en selects de creación y edición
async function cargarTiposEmpresa(preselectedId = null) {
  try {
    const res = await fetch('/api/gestionambiental/tipos-empresa?soloActivos=1');
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Error al cargar tipos de empresa');

    const opciones = Array.isArray(data) ? data : (data.tipos || []);

    const crearSelect = document.getElementById('tipoEmpresa');
    const editarSelect = document.getElementById('editTipoEmpresa');

    const renderOptions = (select, selected) => {
      if (!select) return;
      const current = select.value; // preservar si ya había uno
      let html = '<option value="">-- Sin tipo --</option>';
      for (const t of opciones) {
        const id = t._id || t.id;
        const nombre = t.nombre || 'Sin nombre';
        const sel = selected ? (selected === id) : (current && current === id);
        html += `<option value="${id}" ${sel ? 'selected' : ''}>${nombre}</option>`;
      }
      select.innerHTML = html;
      // Disparar change para UI
      select.dispatchEvent(new Event('change'));
    };

    renderOptions(crearSelect, preselectedId);
    renderOptions(editarSelect, preselectedId);
  } catch (e) {
    console.error('Error cargando Tipos de Empresa:', e);
  }
}

// Intentar seleccionar un tipo en el select de edición considerando distintas formas
function preseleccionarTipoEdicion(empresa) {
  const editarSelect = document.getElementById('editTipoEmpresa');
  if (!editarSelect) return;
  let tipoId = null;
  if (empresa.tipo) {
    if (typeof empresa.tipo === 'string') tipoId = empresa.tipo;
    else if (empresa.tipo._id) tipoId = empresa.tipo._id;
    else if (empresa.tipo.id) tipoId = empresa.tipo.id;
  }
  // Si aún no hay opciones cargadas, cargarlas con preselección
  if (!editarSelect.options || editarSelect.options.length <= 1) {
    cargarTiposEmpresa(tipoId);
  } else if (tipoId) {
    editarSelect.value = tipoId;
    editarSelect.dispatchEvent(new Event('change'));
  }
}

function getStatusBadge(status) {
  const statusMap = {
    '1': { text: 'Activo', class: 'bg-success' },
    '0': { text: 'Inactivo', class: 'bg-danger' }
  };
  
  const statusInfo = statusMap[status] || { text: 'Desconocido', class: 'bg-secondary' };
  return `<span class="badge ${statusInfo.class}">${statusInfo.text}</span>`;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Funciones de CRUD
function editarEmpresa(id) {
  console.log('Editar empresa:', id);
  
  // Mostrar loading
  Swal.fire({
    title: 'Cargando empresa...',
    text: 'Obteniendo información para edición',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
  
  // Cargar datos de la empresa para edición
  fetch(`/api/gestionambiental/empresas/${id}`)
    .then(response => {
      console.log('Respuesta del servidor:', response.status, response.statusText);
      return response.json();
    })
    .then(data => {
      console.log('Datos recibidos para edición:', data);
      if (data && data._id) {
        const empresa = data;
        
        // Cerrar loading
        Swal.close();
        
        // Abrir modal de edición
        openEditModal(empresa);
      } else {
        console.error('Datos de empresa inválidos:', data);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo cargar la información de la empresa',
          icon: 'error'
        });
      }
    })
    .catch(error => {
      console.error('Error al cargar empresa para edición:', error);
      Swal.close();
      Swal.fire({
        title: 'Error',
        text: 'Error al cargar la información de la empresa',
        icon: 'error'
      });
    });
}

// Eliminar empresa
async function eliminarEmpresa(id) {
  try {
            const result = await Swal.fire({
          title: '¿Estás seguro?',
          text: "La empresa será eliminada permanentemente y no aparecerá en la tabla",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'Sí, eliminar empresa',
          cancelButtonText: 'Cancelar'
        });

    if (result.isConfirmed) {
      const response = await fetch(`/api/gestionambiental/empresas/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
                        Swal.fire(
                  '¡Empresa eliminada!',
                  data.message,
                  'success'
                );
                
                // Recargar la tabla para que la empresa eliminada desaparezca
                await loadEmpresas(currentPage);
                await loadStats();
      } else {
        const errorData = await response.json();
        Swal.fire(
          'Error',
                      errorData.message || 'Error al eliminar la empresa',
          'error'
        );
      }
    }
  } catch (error) {
    console.error('Error al eliminar empresa:', error);
    Swal.fire(
      'Error',
                'Error de conexión al eliminar la empresa',
      'error'
    );
  }
}

// Función para abrir modal de edición
function openEditModal(empresa) {
  console.log('Abriendo modal de edición para:', empresa.razonSocial);
  console.log('Datos completos de la empresa:', empresa);
  
  // Buscar el modal existente
  const modal = document.getElementById('modalEditarEmpresa');
  if (!modal) {
    console.error('Modal no encontrado');
    Swal.fire({
      title: 'Error',
      text: 'No se encontró el modal de edición',
      icon: 'error'
    });
    return;
  }
  
  // Poblar los campos del formulario
  populateFormFields(empresa);

  // Preseleccionar tipo si existe
  preseleccionarTipoEdicion(empresa);
  
  // Mostrar el modal sin afectar el layout
  openModalWithoutLayoutChange(modal);
}

// Función para poblar los campos del formulario
function populateFormFields(empresa) {
  console.log('Poblando campos con datos:', empresa);
  
  // Primero asignar el ID de la empresa al campo oculto
  const editEmpresaIdField = document.getElementById('editEmpresaId');
  if (editEmpresaIdField) {
    editEmpresaIdField.value = empresa._id;
    console.log('ID de empresa asignado:', empresa._id);
  } else {
    console.error('Campo editEmpresaId no encontrado');
  }
  
  // Mapeo de campos de la empresa a los campos del formulario
  const fieldMappings = {
    'razonSocial': 'editRazonSocial',
    'sucursal': 'editSucursal',
    'rfc': 'editRfc',
    'telefono': 'editTelefono',
    'correo': 'editCorreo',
    'status': 'editStatus'
  };
  
  // Poblar cada campo
  Object.entries(fieldMappings).forEach(([empresaField, formField]) => {
    const field = document.getElementById(formField);
    if (field && empresa[empresaField] !== undefined) {
      if (field.type === 'select-one') {
        // Para campos select
        field.value = empresa[empresaField];
        // Trigger change event para actualizar la UI
        field.dispatchEvent(new Event('change'));
      } else {
        // Para campos de texto normales
        field.value = empresa[empresaField] || '';
      }
    }
  });
  
  // Manejar campos especiales
  handleSpecialFields(empresa);
  
  // Log final para verificar que todos los campos estén poblados
  console.log('Campos poblados - ID:', document.getElementById('editEmpresaId')?.value);
  console.log('Campos poblados - Razón Social:', document.getElementById('editRazonSocial')?.value);
  console.log('Campos poblados - RFC:', document.getElementById('editRfc')?.value);

  // Asegurar que el catálogo esté cargado y el tipo preseleccionado
  preseleccionarTipoEdicion(empresa);
}

// Función para manejar campos especiales
function handleSpecialFields(empresa) {
  // Manejar dirección
  if (empresa.direccion) {
    const direccionFields = {
      'calle': 'editCalle',
      'noExterior': 'editNoExterior',
      'noInterior': 'editNoInterior',
      'colonia': 'editColonia',
      'cp': 'editCp',
      'localidad': 'editLocalidad',
      'municipio': 'editMunicipio',
      'estado': 'editEstado'
    };
    
    Object.entries(direccionFields).forEach(([direccionField, formField]) => {
      const field = document.getElementById(formField);
      if (field && empresa.direccion[direccionField]) {
        field.value = empresa.direccion[direccionField];
      }
    });
  }
  
  // Manejar notificaciones
  if (empresa.notificaciones) {
    const notifFields = {
      'calle': 'editCalleNotificaciones',
      'noExterior': 'editNoExteriorNotificaciones',
      'noInterior': 'editNoInteriorNotificaciones',
      'colonia': 'editColoniaNotificaciones',
      'cp': 'editCpNotificaciones',
      'localidad': 'editLocalidadNotificaciones',
      'municipio': 'editMunicipioNotificaciones',
      'telefono': 'editTelefonoNotificaciones',
      'correo': 'editCorreoNotificaciones'
    };
    
    Object.entries(notifFields).forEach(([notifField, formField]) => {
      const field = document.getElementById(formField);
      if (field && empresa.notificaciones[notifField]) {
        field.value = empresa.notificaciones[notifField];
      }
    });
  }
  
  // Manejar representante legal
  if (empresa.representanteLegal) {
    const repFields = {
      'nombre': 'editRepNombre',
      'correo': 'editRepCorreo',
      'telefono': 'editRepTelefono'
    };
    
    Object.entries(repFields).forEach(([repField, formField]) => {
      const field = document.getElementById(formField);
      if (field && empresa.representanteLegal[repField]) {
        field.value = empresa.representanteLegal[repField];
      }
    });
  }
}

// Event listener para el formulario
document.addEventListener('DOMContentLoaded', function() {
  console.log('Configurando event listeners para el formulario...');
  
  // Esperar un poco para asegurar que Bootstrap esté cargado
  setTimeout(() => {
    initializeFormHandlers();
  }, 100);
});

// Función para inicializar los manejadores del formulario
function initializeFormHandlers() {
  console.log('Inicializando manejadores del formulario...');
  
  // Verificar que Bootstrap esté disponible
  if (typeof bootstrap === 'undefined') {
    console.error('Bootstrap no está disponible. Esperando...');
    setTimeout(initializeFormHandlers, 500);
    return;
  }
  
  console.log('Bootstrap disponible:', typeof bootstrap);
  
  const formEmpresa = document.getElementById('formEmpresa');
  if (formEmpresa) {
    console.log('Formulario encontrado, agregando event listener');
    formEmpresa.addEventListener('submit', handleFormSubmit);
    // Asegurar que el select de tipos esté cargado para el modal de creación
    cargarTiposEmpresa();
  } else {
    console.error('Formulario no encontrado');
  }
  
  const formEditarEmpresa = document.getElementById('formEditarEmpresa');
  if (formEditarEmpresa) {
    console.log('Formulario de edición encontrado, agregando event listener');
    formEditarEmpresa.addEventListener('submit', handleEditFormSubmit);
    // Cargar catálogo para el modal de edición (sin preselección por ahora)
    cargarTiposEmpresa();
  } else {
    console.error('Formulario de edición no encontrado');
  }
  
  console.log('Manejadores del formulario inicializados');
}

// Función para manejar el envío del formulario de creación
async function handleFormSubmit(e) {
  e.preventDefault();
  console.log('Formulario de creación enviado');
  
  const formData = {
    razonSocial: document.getElementById('razonSocial').value.trim(),
    tipo: (document.getElementById('tipoEmpresa')?.value || '').trim() || null,
    sucursal: document.getElementById('sucursal').value.trim(),
    rfc: document.getElementById('rfc').value.trim(),
    telefono: document.getElementById('telefono').value.trim(),
    correo: document.getElementById('correo').value.trim(),
    direccion: {
      calle: document.getElementById('calle').value.trim(),
      noExterior: document.getElementById('noExterior').value.trim(),
      noInterior: document.getElementById('noInterior').value.trim(),
      colonia: document.getElementById('colonia').value.trim(),
      cp: document.getElementById('cp').value.trim(),
      localidad: document.getElementById('localidad').value.trim(),
      municipio: document.getElementById('municipio').value.trim(),
      estado: document.getElementById('estado').value.trim()
    },
            notificaciones: {
          calle: document.getElementById('calleNotificaciones').value.trim(),
          noExterior: document.getElementById('noExteriorNotificaciones').value.trim(),
          noInterior: document.getElementById('noInteriorNotificaciones').value.trim(),
          colonia: document.getElementById('coloniaNotificaciones').value.trim(),
          cp: document.getElementById('cpNotificaciones').value.trim(),
          localidad: document.getElementById('localidadNotificaciones').value.trim(),
          municipio: document.getElementById('municipioNotificaciones').value.trim(),
          telefono: document.getElementById('telefonoNotificaciones').value.trim(),
          correo: document.getElementById('correoNotificaciones').value.trim()
        },
    representanteLegal: {
      nombre: document.getElementById('repNombre').value.trim(),
      correo: document.getElementById('repCorreo').value.trim(),
      telefono: document.getElementById('repTelefono').value.trim()
    }
  };
  
  // Validar campos requeridos
  const requiredFields = ['razonSocial', 'rfc', 'telefono', 'correo'];
  const missingFields = [];
  
  requiredFields.forEach(fieldName => {
    if (!formData[fieldName]) {
      missingFields.push(fieldName);
    }
  });
  
  // Validar dirección
  const direccionFields = ['calle', 'colonia', 'cp', 'municipio', 'estado'];
  direccionFields.forEach(fieldName => {
    if (!formData.direccion[fieldName]) {
      missingFields.push(`dirección.${fieldName}`);
    }
  });
  
  // Validar representante legal
  const repFields = ['nombre', 'correo', 'telefono'];
  repFields.forEach(fieldName => {
    if (!formData.representanteLegal[fieldName]) {
      missingFields.push(`representante.${fieldName}`);
    }
  });
  
  if (missingFields.length > 0) {
    Swal.fire('❌ Error', `Por favor completa los siguientes campos obligatorios: ${missingFields.join(', ')}`, 'error');
    return;
  }
  
  try {
    // Mostrar loading
    Swal.fire({
      title: 'Guardando...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    const res = await fetch('/api/gestionambiental/empresas/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    console.log('Respuesta del servidor:', res.status, res.statusText);
    
    const data = await res.json();
    console.log('Datos de respuesta:', data);
    
    if (res.ok) {
      // Cerrar loading
      Swal.close();
      
      // Cerrar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('modalEmpresa'));
      if (modal) {
        modal.hide();
      }
      
      // Limpiar padding del body después de cerrar el modal
      setTimeout(() => {
        cleanModalBodyPadding();
      }, 100);
      
      // Recargar tabla y estadísticas
      loadEmpresas(currentPage);
      loadStats();
      
      // Resetear formulario
      document.getElementById('formEmpresa').reset();
      
      // Mostrar mensaje de éxito
      Swal.fire('✅ Éxito', data.message || 'Empresa guardada correctamente', 'success');
    } else {
      throw new Error(data.message || `Error del servidor: ${res.status}`);
    }
  } catch (err) {
    console.error('Error al enviar formulario:', err);
    Swal.close(); // Cerrar loading en caso de error
    
    let errorMessage = 'Error al guardar la empresa';
    if (err.message) {
      errorMessage = err.message;
    } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
      errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
    }
    
    Swal.fire('❌ Error', errorMessage, 'error');
  }
}

// Función para manejar el envío del formulario de edición
async function handleEditFormSubmit(e) {
  e.preventDefault();
  console.log('Formulario de edición enviado');
  
  const empresaId = document.getElementById('editEmpresaId').value;
  console.log('ID de empresa capturado:', empresaId);
  
  if (!empresaId) {
    Swal.fire('❌ Error', 'ID de empresa no encontrado', 'error');
    return;
  }
  
  const formData = {
    razonSocial: document.getElementById('editRazonSocial').value.trim(),
    tipo: (document.getElementById('editTipoEmpresa')?.value || '').trim() || null,
    sucursal: document.getElementById('editSucursal').value.trim(),
    rfc: document.getElementById('editRfc').value.trim(),
    telefono: document.getElementById('editTelefono').value.trim(),
    correo: document.getElementById('editCorreo').value.trim(),
    direccion: {
      calle: document.getElementById('editCalle').value.trim(),
      noExterior: document.getElementById('editNoExterior').value.trim(),
      noInterior: document.getElementById('editNoInterior').value.trim(),
      colonia: document.getElementById('editColonia').value.trim(),
      cp: document.getElementById('editCp').value.trim(),
      localidad: document.getElementById('editLocalidad').value.trim(),
      municipio: document.getElementById('editMunicipio').value.trim(),
      estado: document.getElementById('editEstado').value.trim()
    },
            notificaciones: {
          calle: document.getElementById('editCalleNotificaciones').value.trim(),
          noExterior: document.getElementById('editNoExteriorNotificaciones').value.trim(),
          noInterior: document.getElementById('editNoInteriorNotificaciones').value.trim(),
          colonia: document.getElementById('editColoniaNotificaciones').value.trim(),
          cp: document.getElementById('editCpNotificaciones').value.trim(),
          localidad: document.getElementById('editLocalidadNotificaciones').value.trim(),
          municipio: document.getElementById('editMunicipioNotificaciones').value.trim(),
          telefono: document.getElementById('editTelefonoNotificaciones').value.trim(),
          correo: document.getElementById('editCorreoNotificaciones').value.trim()
        },
    representanteLegal: {
      nombre: document.getElementById('editRepNombre').value.trim(),
      correo: document.getElementById('editRepCorreo').value.trim(),
      telefono: document.getElementById('editRepTelefono').value.trim()
    },
    status: parseInt(document.getElementById('editStatus').value)
  };
  
  // Validar campos requeridos
  const requiredFields = ['razonSocial', 'rfc', 'telefono', 'correo'];
  const missingFields = [];
  
  requiredFields.forEach(fieldName => {
    if (!formData[fieldName]) {
      missingFields.push(fieldName);
    }
  });
  
  // Validar dirección
  const direccionFields = ['calle', 'colonia', 'cp', 'municipio', 'estado'];
  direccionFields.forEach(fieldName => {
    if (!formData.direccion[fieldName]) {
      missingFields.push(`dirección.${fieldName}`);
    }
  });
  
  // Validar representante legal
  const repFields = ['nombre', 'correo', 'telefono'];
  repFields.forEach(fieldName => {
    if (!formData.representanteLegal[fieldName]) {
      missingFields.push(`representante.${fieldName}`);
    }
  });
  
  if (missingFields.length > 0) {
    Swal.fire('❌ Error', `Por favor completa los siguientes campos obligatorios: ${missingFields.join(', ')}`, 'error');
    return;
  }
  
  try {
    // Mostrar loading
    Swal.fire({
      title: 'Actualizando...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    const res = await fetch(`/api/gestionambiental/empresas/${empresaId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    console.log('Respuesta del servidor:', res.status, res.statusText);
    
    const data = await res.json();
    console.log('Datos de respuesta:', data);
    
    if (res.ok) {
      // Cerrar loading
      Swal.close();
      
      // Cerrar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarEmpresa'));
      if (modal) {
        modal.hide();
      }
      
      // Recargar tabla y estadísticas
      loadEmpresas(currentPage);
      loadStats();
      
      // Mostrar mensaje de éxito
      Swal.fire('✅ Éxito', data.message || 'Empresa actualizada correctamente', 'success');
    } else {
      throw new Error(data.message || `Error del servidor: ${res.status}`);
    }
  } catch (err) {
    console.error('Error al enviar formulario de edición:', err);
    Swal.close(); // Cerrar loading en caso de error
    
    let errorMessage = 'Error al actualizar la empresa';
    if (err.message) {
      errorMessage = err.message;
    } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
      errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
    }
    
    Swal.fire('❌ Error', errorMessage, 'error');
  }
}

// Función para resetear el modal
function resetModal() {
  console.log('Reseteando modal...');
  
  const modal = document.getElementById('modalEmpresa');
  if (modal) {
    // Resetear formulario
    const form = modal.querySelector('form');
    if (form) {
      form.reset();
    }
    
    console.log('Modal reseteado correctamente');
  } else {
    console.error('Modal no encontrado para resetear');
  }
}

// Función para ver empresa
async function verEmpresa(id) {
  try {
    console.log(`👁️ Visualizando empresa con ID: ${id}`);
    
    // Mostrar loading
    Swal.fire({
      title: 'Cargando...',
      text: 'Obteniendo información de la empresa',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    const response = await fetch(`/api/gestionambiental/empresas/ver/${id}`);
    const data = await response.json();
    
    if (response.ok) {
      Swal.close();
      mostrarModalVerEmpresa(data);
    } else {
      throw new Error(data.message || 'Error al obtener la empresa');
    }
  } catch (error) {
    console.error('Error al ver empresa:', error);
    Swal.close();
    Swal.fire('❌ Error', error.message || 'Error al obtener la empresa', 'error');
  }
}

// Función para mostrar modal de visualización
function mostrarModalVerEmpresa(empresa) {
  const modalHTML = `
    <div class="modal fade" id="modalVerEmpresa" tabindex="-1">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-eye me-2"></i>
              Ver Empresa: ${empresa.razonSocial}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <!-- Información de la Empresa -->
            <h6 class="text-primary mb-3">
              <i class="fas fa-building me-2"></i>
              Información de la Empresa
            </h6>
            <div class="row g-3 mb-4">
              <div class="col-md-6">
                <label class="form-label fw-bold">Código:</label>
                <p class="form-control-plaintext">${empresa.codigo || '-'}</p>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">Razón Social:</label>
                <p class="form-control-plaintext">${empresa.razonSocial || '-'}</p>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">Tipo:</label>
                <p class="form-control-plaintext">${empresa.tipo?.nombre || empresa.tipo || '-'}</p>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">Sucursal:</label>
                <p class="form-control-plaintext">${empresa.sucursal || '-'}</p>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">RFC:</label>
                <p class="form-control-plaintext"><code class="bg-light px-2 py-1 rounded">${empresa.rfc || '-'}</code></p>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">Teléfono:</label>
                <p class="form-control-plaintext">${empresa.telefono || '-'}</p>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">Correo Electrónico:</label>
                <p class="form-control-plaintext">${empresa.correo || '-'}</p>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">Calle:</label>
                <p class="form-control-plaintext">${empresa.direccion?.calle || '-'}</p>
              </div>
              <div class="col-md-3">
                <label class="form-label fw-bold">No. Exterior:</label>
                <p class="form-control-plaintext">${empresa.direccion?.noExterior || '-'}</p>
              </div>
              <div class="col-md-3">
                <label class="form-label fw-bold">No. Interior:</label>
                <p class="form-control-plaintext">${empresa.direccion?.noInterior || '-'}</p>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">Colonia:</label>
                <p class="form-control-plaintext">${empresa.direccion?.colonia || '-'}</p>
              </div>
              <div class="col-md-4">
                <label class="form-label fw-bold">Código Postal:</label>
                <p class="form-control-plaintext">${empresa.direccion?.cp || '-'}</p>
              </div>
              <div class="col-md-4">
                <label class="form-label fw-bold">Localidad:</label>
                <p class="form-control-plaintext">${empresa.direccion?.localidad || '-'}</p>
              </div>
              <div class="col-md-4">
                <label class="form-label fw-bold">Municipio:</label>
                <p class="form-control-plaintext">${empresa.direccion?.municipio || '-'}</p>
              </div>
              <div class="col-md-4">
                <label class="form-label fw-bold">Estado:</label>
                <p class="form-control-plaintext">${empresa.direccion?.estado || '-'}</p>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">Estatus:</label>
                <p class="form-control-plaintext">${getStatusBadge(empresa.status)}</p>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">Área:</label>
                <p class="form-control-plaintext">${empresa.area === 6 ? 'Gestión Ambiental' : empresa.area}</p>
              </div>
            </div>
            
            <!-- Separador -->
            <hr class="my-4">
            
            <!-- Datos para Notificaciones -->
            <h6 class="text-primary mb-3">
              <i class="fas fa-bell me-2"></i>
              Datos para Notificaciones
            </h6>
            <div class="row g-3 mb-4">
              <div class="col-md-6">
                <label class="form-label fw-bold">Calle para Notificaciones:</label>
                <p class="form-control-plaintext">${empresa.notificaciones?.calle || '-'}</p>
              </div>
              <div class="col-md-3">
                <label class="form-label fw-bold">No. Exterior para Notificaciones:</label>
                <p class="form-control-plaintext">${empresa.notificaciones?.noExterior || '-'}</p>
              </div>
              <div class="col-md-3">
                <label class="form-label fw-bold">No. Interior para Notificaciones:</label>
                <p class="form-control-plaintext">${empresa.notificaciones?.noInterior || '-'}</p>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">Colonia para Notificaciones:</label>
                <p class="form-control-plaintext">${empresa.notificaciones?.colonia || '-'}</p>
              </div>
              <div class="col-md-4">
                <label class="form-label fw-bold">CP para Notificaciones:</label>
                <p class="form-control-plaintext">${empresa.notificaciones?.cp || '-'}</p>
              </div>
              <div class="col-md-4">
                <label class="form-label fw-bold">Localidad para Notificaciones:</label>
                <p class="form-control-plaintext">${empresa.notificaciones?.localidad || '-'}</p>
              </div>
              <div class="col-md-4">
                <label class="form-label fw-bold">Municipio para Notificaciones:</label>
                <p class="form-control-plaintext">${empresa.notificaciones?.municipio || '-'}</p>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">Teléfono para Notificaciones:</label>
                <p class="form-control-plaintext">${empresa.notificaciones?.telefono || '-'}</p>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">Correo para Notificaciones:</label>
                <p class="form-control-plaintext">${empresa.notificaciones?.correo || '-'}</p>
              </div>
            </div>
            
            <!-- Separador -->
            <hr class="my-4">
            
            <!-- Información del Representante Legal -->
            <h6 class="text-primary mb-3">
              <i class="fas fa-user-tie me-2"></i>
              Información del Representante Legal
            </h6>
            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label fw-bold">Nombre del Representante:</label>
                <p class="form-control-plaintext">${empresa.representanteLegal?.nombre || '-'}</p>
              </div>
              <div class="col-md-4">
                <label class="form-label fw-bold">Correo del Representante:</label>
                <p class="form-control-plaintext">${empresa.representanteLegal?.correo || '-'}</p>
              </div>
              <div class="col-md-4">
                <label class="form-label fw-bold">Teléfono del Representante:</label>
                <p class="form-control-plaintext">${empresa.representanteLegal?.telefono || '-'}</p>
              </div>
            </div>
            
            <!-- Información adicional -->
            <hr class="my-4">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label fw-bold">Fecha de Creación:</label>
                <p class="form-control-plaintext">${empresa.createdAt ? new Date(empresa.createdAt).toLocaleDateString('es-MX') : '-'}</p>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">Última Actualización:</label>
                <p class="form-control-plaintext">${empresa.updatedAt ? new Date(empresa.updatedAt).toLocaleDateString('es-MX') : '-'}</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              <i class="fas fa-times me-2"></i>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remover modal anterior si existe
  const modalAnterior = document.getElementById('modalVerEmpresa');
  if (modalAnterior) {
    modalAnterior.remove();
  }
  
  // Agregar el modal al DOM
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Mostrar el modal
  const modal = new bootstrap.Modal(document.getElementById('modalVerEmpresa'));
  modal.show();
  
  // Limpiar el modal cuando se cierre
  document.getElementById('modalVerEmpresa').addEventListener('hidden.bs.modal', function() {
    this.remove();
  });
}

// Función para limpiar el padding del body que Bootstrap agrega
function cleanModalBodyPadding() {
  // Solo limpiar estilos relacionados con el modal
  if (document.body.classList.contains('modal-open')) {
    document.body.classList.remove('modal-open');
  }
  
  // Limpiar padding-right si existe
  if (document.body.style.paddingRight) {
    document.body.style.paddingRight = '';
  }
  
  // Restaurar overflow si fue cambiado por el modal
  if (document.body.style.overflow === 'hidden') {
    document.body.style.overflow = '';
  }
  
  console.log('Estilos del modal limpiados');
}

// Función para abrir modal sin afectar el layout
function openModalWithoutLayoutChange(modalElement) {
  // Abrir el modal normalmente
  const bootstrapModal = new bootstrap.Modal(modalElement, {
    backdrop: true,
    keyboard: true,
    focus: true
  });
  
  // Limpiar el padding después de que se muestre el modal
  modalElement.addEventListener('shown.bs.modal', function onModalShown() {
    // Pequeño delay para asegurar que Bootstrap termine sus operaciones
    setTimeout(() => {
      if (document.body.style.paddingRight) {
        document.body.style.paddingRight = '';
      }
      if (document.body.classList.contains('modal-open')) {
        document.body.classList.remove('modal-open');
      }
    }, 100);
    
    // Remover el event listener para evitar duplicados
    modalElement.removeEventListener('shown.bs.modal', onModalShown);
  }, { once: true });
  
  bootstrapModal.show();
  
  return bootstrapModal;
}

// Función para prevenir cambios de layout
function preventLayoutChanges() {
  // Solo prevenir cambios específicos del modal, no todos los cambios de estilo
  let isModalOpen = false;
  
  // Observar cambios en el body solo cuando sea necesario
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const body = mutation.target;
        
        // Solo intervenir si es un cambio relacionado con el modal
        if (isModalOpen || body.classList.contains('modal-open')) {
          // Si se agrega padding-right al body por el modal, removerlo
          if (body.style.paddingRight && body.style.paddingRight !== '0px') {
            body.style.paddingRight = '0px';
          }
          
          // Si se cambia el overflow por el modal, restaurarlo
          if (body.style.overflow && body.style.overflow !== 'auto') {
            body.style.overflow = 'auto';
          }
        }
      }
    });
  });
  
  // Observar cambios en el body
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['style']
  });
  
  // Detectar cuando se abre/cierra un modal
  document.addEventListener('show.bs.modal', function() {
    isModalOpen = true;
  });
  
  document.addEventListener('hidden.bs.modal', function() {
    isModalOpen = false;
    // Limpiar cualquier estilo residual
    setTimeout(() => {
      if (document.body.style.paddingRight) {
        document.body.style.paddingRight = '';
      }
      if (document.body.style.overflow) {
        document.body.style.overflow = '';
      }
    }, 100);
  });
  
  console.log('Observador de layout configurado (solo para modales)');
}

// Event listener global para capturar errores
window.addEventListener('error', function(e) {
  console.error('Error global capturado:', e.error);
  console.error('Mensaje:', e.message);
  console.error('Archivo:', e.filename);
  console.error('Línea:', e.lineno);
});

// Event listener para capturar promesas rechazadas
window.addEventListener('unhandledrejection', function(e) {
  console.error('Promesa rechazada no manejada:', e.reason);
});
