// Configuración global
let currentPage = 1;
let currentLimit = 10;
let currentFilters = {
  orden: 'normal',
  busqueda: '',
  tipoCorrespondencia: '',
  status: '',
  departamentoTurnado: '',
  fechaDesde: '',
  fechaHasta: ''
};

// Elementos del DOM
const elements = {
  table: document.getElementById('tablaRegistros'),
  tbody: document.querySelector('#tablaRegistros tbody'),
  loadingIndicator: document.getElementById('loadingIndicator'),
  tableContent: document.getElementById('tableContent'),
  noResults: document.getElementById('noResults'),
  pagination: document.getElementById('pagination'),
  limitSelect: document.getElementById('limitSelect'),
  searchInput: document.getElementById('searchInput'),
  filterTipo: document.getElementById('filterTipo'),
  filterStatus: document.getElementById('filterStatus'),
  filterDepartamento: document.getElementById('filterDepartamento'),
  filterFechaDesde: document.getElementById('filterFechaDesde'),
  filterFechaHasta: document.getElementById('filterFechaHasta'),
  btnAplicarFiltros: document.getElementById('btnAplicarFiltros'),
  btnLimpiarFiltros: document.getElementById('btnLimpiarFiltros'),
  ordenNormal: document.getElementById('ordenNormal'),
  ordenReciente: document.getElementById('ordenReciente'),
  ordenAntiguo: document.getElementById('ordenAntiguo')
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM cargado, inicializando...');
  
  // Verificar que los elementos de estadísticas existan
  const statsElements = [
    'totalOficios',
    'pendientes', 
    'enProceso',
    'finalizados',
    'internos',
    'externos'
  ];
  
  console.log('Verificando elementos de estadísticas:');
  statsElements.forEach(id => {
    const element = document.getElementById(id);
    console.log(`${id}:`, element ? 'Encontrado' : 'NO ENCONTRADO');
  });
  
  initializeEventListeners();
  loadOficios();
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
  // Filtros
  elements.btnAplicarFiltros.addEventListener('click', applyFilters);
  elements.btnLimpiarFiltros.addEventListener('click', clearFilters);
  
  // Búsqueda en tiempo real
  elements.searchInput.addEventListener('input', debounce(handleSearch, 500));
  
  // Cambio de límite por página
  elements.limitSelect.addEventListener('change', handleLimitChange);
  
  // Ordenamiento - usar múltiples eventos para asegurar que funcione
  [elements.ordenNormal, elements.ordenReciente, elements.ordenAntiguo].forEach(radio => {
    radio.addEventListener('change', handleOrderChange);
    radio.addEventListener('click', handleOrderChange);
    radio.addEventListener('input', handleOrderChange);
  });
  
  // Event listener específico para Bootstrap btn-check
  document.addEventListener('change', function(event) {
    if (event.target.name === 'ordenRegistros' || 
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
  console.log('Reciente:', elements.ordenReciente, 'checked:', elements.ordenReciente?.checked);
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
  elements.filterTipo.addEventListener('change', handleFilterChange);
  elements.filterStatus.addEventListener('change', handleFilterChange);
  if (elements.filterDepartamento) elements.filterDepartamento.addEventListener('change', handleFilterChange);
  elements.filterFechaDesde.addEventListener('change', handleFilterChange);
  elements.filterFechaHasta.addEventListener('change', handleFilterChange);
  
  // Botón de exportar a Excel
  const btnExportar = document.getElementById('btnExportar');
  if (btnExportar) {
    btnExportar.addEventListener('click', showExportModal);
  }
}

// Cargar oficios con paginación
async function loadOficios(page = 1) {
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
      tipoCorrespondencia: currentFilters.tipoCorrespondencia,
      status: currentFilters.status,
      departamentoTurnado: currentFilters.departamentoTurnado,
      fechaDesde: currentFilters.fechaDesde,
      fechaHasta: currentFilters.fechaHasta
    });
    
    const url = `/api/oficios?${queryParams}`;
    console.log('URL de la petición:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log('Datos recibidos:', data);
      console.log('Primer oficio para debugging:', data.oficios[0]);
      if (data.oficios[0]) {
        console.log('Campos del primer oficio:', Object.keys(data.oficios[0]));
        console.log('tipoCorrespondencia del primer oficio:', data.oficios[0].tipoCorrespondencia);
      }
      renderOficios(data.oficios);
      renderPagination(data.paginacion);
      currentPage = page;
    } else {
      throw new Error(data.message || 'Error al cargar oficios');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Error al cargar los oficios');
  } finally {
    hideLoading();
  }
}

// Renderizar oficios en la tabla
function renderOficios(oficios) {
  if (!oficios || oficios.length === 0) {
    showNoResults();
    return;
  }
  
  elements.tbody.innerHTML = '';
  
  oficios.forEach(oficio => {
    // Debug: mostrar el tipo de correspondencia de cada oficio
    console.log(`Oficio ${oficio.noOficio}: tipoCorrespondencia = "${oficio.tipoCorrespondencia}" (tipo: ${typeof oficio.tipoCorrespondencia})`);
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="text-center">
        <div class="fw-bold text-primary" title="${oficio.noOficio || '-'}">
          ${oficio.noOficio || '-'}
        </div>
      </td>
      <td class="text-center">
        <small class="text-muted">${formatDate(oficio.fecha)}</small>
      </td>
      <td class="text-center">
        <span class="badge ${oficio.tipoCorrespondencia === '1' || oficio.tipoCorrespondencia === 1 ? 'bg-primary' : 'bg-secondary'}">
          ${oficio.tipoCorrespondencia === '1' || oficio.tipoCorrespondencia === 1 ? 'I' : 'E'}
        </span>
        <small class="d-block text-muted">${oficio.tipoCorrespondencia === '1' || oficio.tipoCorrespondencia === 1 ? 'Interno' : 'Externo'}</small>
      </td>
      <td>
        <div class="text-truncate" title="${oficio.institucion || '-'}">
          ${oficio.institucion || '-'}
        </div>
      </td>
      <td>
        <div class="text-truncate" title="${oficio.asunto || '-'}">
          ${oficio.asunto || '-'}
        </div>
      </td>
      <td class="text-center">
        ${getStatusBadge(oficio.status)}
      </td>
      <td class="text-center">
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-primary btn-sm" onclick="viewOficio('${oficio._id}')" title="Ver">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-outline-warning btn-sm" onclick="editOficio('${oficio._id}')" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteOficio('${oficio._id}')" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
        </div>
                 ${oficio.archivos && oficio.archivos.length > 0 ? `
           <div class="mt-1">
             <button class="btn btn-outline-info btn-sm" onclick="showArchivosModal('${oficio._id}', ${JSON.stringify(oficio.archivos).replace(/"/g, '&quot;')})" title="Ver archivos (${oficio.archivos.length})">
               <i class="fas fa-files-o me-1"></i>
               Archivos (${oficio.archivos.length})
             </button>
           </div>
         ` : ''}
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
  loadOficios(page);
}

// Aplicar filtros
function applyFilters() {
  const newFilters = {
    orden: getSelectedOrder(),
    busqueda: elements.searchInput.value.trim(),
    tipoCorrespondencia: elements.filterTipo.value,
    status: elements.filterStatus.value,
    departamentoTurnado: elements.filterDepartamento ? elements.filterDepartamento.value : '',
    fechaDesde: elements.filterFechaDesde.value,
    fechaHasta: elements.filterFechaHasta.value
  };
  
  console.log('Aplicando filtros:', newFilters);
  console.log('Valor del filtro tipo:', elements.filterTipo.value);
  
  currentFilters = newFilters;
  currentPage = 1; // Reset a primera página
  loadOficios(1);
}

// Limpiar filtros
function clearFilters() {
  elements.searchInput.value = '';
  elements.filterTipo.value = '';
  elements.filterStatus.value = '';
  if (elements.filterDepartamento) elements.filterDepartamento.value = '';
  elements.filterFechaDesde.value = '';
  elements.filterFechaHasta.value = '';
  
  currentFilters = {
    orden: 'normal',
    busqueda: '',
    tipoCorrespondencia: '',
    status: '',
    departamentoTurnado: '',
    fechaDesde: '',
    fechaHasta: ''
  };
  
  // Reset ordenamiento
  elements.ordenNormal.checked = true;
  
  currentPage = 1;
  loadOficios(1);
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
  console.log('Reciente:', elements.ordenReciente.checked, 'ID:', elements.ordenReciente.id);
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
  loadOficios(1);
}

function handleLimitChange() {
  currentLimit = parseInt(elements.limitSelect.value);
  currentPage = 1;
  loadOficios(1);
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
      loadOficios(1);
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
    const response = await fetch('/api/oficios/stats');
    const data = await response.json();
    
    console.log('Respuesta de estadísticas:', data);
    console.log('Status de la respuesta:', response.status);
    
    if (response.ok && data.stats) {
      console.log('Estadísticas recibidas:', data.stats);
      updateStats(data.stats);
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
    totalOficios: document.getElementById('totalOficios'),
    pendientes: document.getElementById('pendientes'),
    enProceso: document.getElementById('enProceso'),
    finalizados: document.getElementById('finalizados'),
    internos: document.getElementById('internos'),
    externos: document.getElementById('externos')
  };
  
  // Actualizar cada elemento si existe
  if (elements.totalOficios) {
    elements.totalOficios.textContent = stats.total || 0;
    console.log('Total actualizado:', stats.total || 0);
  }
  
  if (elements.pendientes) {
    elements.pendientes.textContent = stats.pendientes || 0;
    console.log('Pendientes actualizados:', stats.pendientes || 0);
  }
  
  if (elements.enProceso) {
    elements.enProceso.textContent = stats.enProceso || 0;
    console.log('En Proceso actualizados:', stats.enProceso || 0);
  }
  
  if (elements.finalizados) {
    elements.finalizados.textContent = stats.finalizados || 0;
    console.log('Finalizados actualizados:', stats.finalizados || 0);
  }
  
  if (elements.internos) {
    elements.internos.textContent = stats.internos || 0;
    console.log('Internos actualizados:', stats.internos || 0);
  }
  
  if (elements.externos) {
    elements.externos.textContent = stats.externos || 0;
    console.log('Externos actualizados:', stats.externos || 0);
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
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-MX');
}

function getStatusBadge(status) {
  const statusMap = {
    '1': { text: 'Pendiente', class: 'bg-warning' },
    '2': { text: 'En Proceso', class: 'bg-info' },
    '3': { text: 'Finalizado', class: 'bg-success' },
    '4': { text: 'En Revisión', class: 'bg-primary' }
  };
  
  const statusInfo = statusMap[status] || { text: 'Desconocido', class: 'bg-secondary' };
  return `<span class="badge ${statusInfo.class}">${statusInfo.text}</span>`;
}

function getStatusText(status) {
  const statusMap = {
    '1': 'Pendiente',
    '2': 'En Proceso',
    '3': 'Finalizado',
    '4': 'En Revisión'
  };
  
  return statusMap[status] || 'Desconocido';
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
function viewOficio(id) {
  console.log('Ver oficio:', id);
  
  // Mostrar modal de vista
  Swal.fire({
    title: 'Cargando oficio...',
    text: 'Obteniendo información del oficio',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
  
  // Cargar datos del oficio
  fetch(`/api/getOficio/${id}`)
    .then(response => response.json())
    .then(data => {
      if (data.oficio) {
        const oficio = data.oficio;
        
                 // Crear contenido del modal
         const modalContent = `
           <div class="text-start">
             <div class="row">
               <div class="col-md-6">
                 <p><strong>No. Oficio:</strong> ${oficio.noOficio || '-'}</p>
                 <p><strong>Fecha:</strong> ${formatDate(oficio.fecha)}</p>
                 <p><strong>Tipo:</strong> ${oficio.tipoCorrespondencia === '1' || oficio.tipoCorrespondencia === 1 ? 'Interno' : 'Externo'}</p>
                 <p><strong>Estatus:</strong> ${getStatusText(oficio.status)}</p>
               </div>
               <div class="col-md-6">
                 <p><strong>Institución:</strong> ${oficio.institucion || '-'}</p>
                 <p><strong>Asunto:</strong> ${oficio.asunto || '-'}</p>
                 <p><strong>Tipo Respuesta:</strong> ${oficio.tipoRespuesta || '-'}</p>
                 <p><strong>Departamento Turnado:</strong> ${Array.isArray(oficio.departamentoTurnado) ? oficio.departamentoTurnado.join(', ') : oficio.departamentoTurnado || '-'}</p>
               </div>
             </div>
             ${oficio.archivos && oficio.archivos.length > 0 ? `
               <div class="mt-3">
                 <strong>Archivos:</strong>
                 <div class="row">
                   ${oficio.archivos.map(archivo => `
                     <div class="col-md-6 mb-2">
                       <div class="d-flex align-items-center justify-content-between p-2 border rounded">
                         <div class="d-flex align-items-center">
                           <i class="fas fa-file text-primary me-2"></i>
                           <span class="text-truncate" title="${archivo}">${archivo}</span>
                         </div>
                         <button class="btn btn-sm btn-outline-primary ms-2" onclick="downloadFile('${archivo}')" title="Descargar">
                           <i class="fas fa-download"></i>
                         </button>
                       </div>
                     </div>
                   `).join('')}
                 </div>
               </div>
             ` : '<div class="mt-3 text-muted">No hay archivos asociados</div>'}
           </div>
         `;
        
        Swal.fire({
          title: `Oficio ${oficio.noOficio}`,
          html: modalContent,
          icon: 'info',
          confirmButtonText: 'Cerrar',
          width: '800px'
        });
      } else {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo cargar la información del oficio',
          icon: 'error'
        });
      }
    })
    .catch(error => {
      console.error('Error al cargar oficio:', error);
      Swal.fire({
        title: 'Error',
        text: 'Error al cargar la información del oficio',
        icon: 'error'
      });
    });
}

function editOficio(id) {
  console.log('Editar oficio:', id);
  
  // Mostrar loading
  Swal.fire({
    title: 'Cargando oficio...',
    text: 'Obteniendo información para edición',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
  
  // Cargar datos del oficio para edición
  fetch(`/api/getOficio/${id}`)
    .then(response => response.json())
    .then(data => {
      if (data.oficio) {
        const oficio = data.oficio;
        
        // Cerrar loading
        Swal.close();
        
        // Abrir modal de edición
        openEditModal(oficio);
      } else {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo cargar la información del oficio',
          icon: 'error'
        });
      }
    })
    .catch(error => {
      console.error('Error al cargar oficio para edición:', error);
      Swal.fire({
        title: 'Error',
        text: 'Error al cargar la información del oficio',
        icon: 'error'
      });
    });
}

function deleteOficio(id) {
  console.log('Eliminar oficio:', id);
  
  // Usar SweetAlert2 para confirmar eliminación
  Swal.fire({
    title: '¿Estás seguro?',
    text: "Esta acción no se puede deshacer. El oficio será eliminado permanentemente.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      // Mostrar loading
      Swal.fire({
        title: 'Eliminando...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      // Realizar petición de eliminación
      fetch(`/api/deleteOficio/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.message) {
          Swal.fire({
            title: '¡Eliminado!',
            text: data.message,
            icon: 'success'
          }).then(() => {
            // Recargar la tabla y estadísticas
            loadOficios(currentPage);
            loadStats();
          });
        } else {
          throw new Error('Respuesta inválida del servidor');
        }
      })
      .catch(error => {
        console.error('Error al eliminar oficio:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo eliminar el oficio. Inténtalo de nuevo.',
          icon: 'error'
        });
      });
    }
  });
}

// Función para descargar archivos
async function downloadFile(filename) {
  console.log('Descargando archivo:', filename);
  
  try {
    // Mostrar loading
    Swal.fire({
      title: 'Descargando...',
      text: `Preparando descarga de "${filename}"`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    // Intentar diferentes rutas posibles para la descarga
    const possiblePaths = [
      `/archivos/${filename}`,
      `/public/archivos/${filename}`,
      `/uploads/${filename}`,
      `/files/${filename}`
    ];
    
    let downloadSuccess = false;
    
    // Probar cada ruta hasta encontrar una que funcione
    for (const path of possiblePaths) {
      try {
        console.log(`Probando ruta: ${path}`);
        
        // Intentar descargar el archivo completo
        const response = await fetch(path);
        
        if (response.ok) {
          console.log(`Archivo encontrado en: ${path}`);
          
          // Obtener el blob del archivo
          const blob = await response.blob();
          
          // Crear URL del blob
          const url = window.URL.createObjectURL(blob);
          
          // Crear enlace de descarga
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          
          // Agregar el enlace al DOM
          document.body.appendChild(link);
          
          // Simular clic
          link.click();
          
          // Limpiar
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          downloadSuccess = true;
          break;
        }
      } catch (error) {
        console.log(`Error con ruta ${path}:`, error);
        continue;
      }
    }
    
    // Cerrar loading
    Swal.close();
    
    if (downloadSuccess) {
      // Mostrar notificación de éxito
      Swal.fire({
        title: '✅ Descarga iniciada',
        text: `El archivo "${filename}" se está descargando`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } else {
      // Mostrar error y opción de descarga manual
      Swal.fire({
        title: '❌ Archivo no encontrado',
        html: `
          <p>No se pudo encontrar el archivo "${filename}" en el servidor.</p>
          <p>Verifica que el archivo exista o contacta al administrador.</p>
          <div class="mt-3">
            <button class="btn btn-secondary" onclick="Swal.close()">
              <i class="fas fa-times me-2"></i>Cerrar
            </button>
          </div>
        `,
        icon: 'error',
        showConfirmButton: false,
        showCloseButton: true
      });
    }
    
  } catch (error) {
    console.error('Error al descargar archivo:', error);
    Swal.close();
    
    // Mostrar error genérico
    Swal.fire({
      title: '❌ Error en la descarga',
      html: `
        <p>Ocurrió un error al intentar descargar "${filename}".</p>
        <p>Error: ${error.message}</p>
        <div class="mt-3">
          <button class="btn btn-secondary" onclick="Swal.close()">
            <i class="fas fa-times me-2"></i>Cerrar
          </button>
        </div>
      `,
      icon: 'error',
      showConfirmButton: false,
      showCloseButton: true
    });
  }
}

// Función para mostrar modal de archivos
function showArchivosModal(oficioId, archivos) {
  console.log('Mostrando modal de archivos para oficio:', oficioId);
  console.log('Archivos:', archivos);
  
  // Crear contenido del modal
  const modalContent = `
    <div class="text-start">
      <div class="mb-3">
        <h6 class="text-primary mb-2">
          <i class="fas fa-files-o me-2"></i>
          Archivos del Oficio
        </h6>
        <p class="text-muted small mb-0">Selecciona una acción para cada archivo</p>
      </div>
      
      <div class="archivos-lista">
        ${archivos.map((archivo, index) => `
          <div class="archivo-item border rounded p-3 mb-2 bg-light">
            <div class="d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center flex-grow-1">
                <i class="fas fa-file text-primary me-3 fs-4"></i>
                <div class="flex-grow-1">
                  <div class="fw-bold text-truncate" title="${archivo}">${archivo}</div>
                  <small class="text-muted">Archivo ${index + 1} de ${archivos.length}</small>
                </div>
              </div>
              <div class="btn-group btn-group-sm ms-2" role="group">
                <button class="btn btn-outline-primary" onclick="previewArchivo('${archivo}')" title="Vista previa">
                  <i class="fas fa-eye"></i>
                  <span class="d-none d-sm-inline ms-1">Vista</span>
                </button>
                <button class="btn btn-outline-success" onclick="downloadArchivo('${archivo}')" title="Descargar">
                  <i class="fas fa-download"></i>
                  <span class="d-none d-sm-inline ms-1">Descargar</span>
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="mt-3 text-center">
        <button class="btn btn-secondary" onclick="Swal.close()">
          <i class="fas fa-times me-2"></i>Cerrar
        </button>
      </div>
    </div>
  `;
  
  // Mostrar modal con SweetAlert2
  Swal.fire({
    title: `Archivos del Oficio`,
    html: modalContent,
    icon: 'info',
    width: '700px',
    showConfirmButton: false,
    showCloseButton: true,
    customClass: {
      container: 'archivos-modal-container'
    }
  });
}

// Función para verificar conectividad del servidor
async function checkServerConnection() {
  try {
    const response = await fetch('/api/oficios', { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error de conectividad:', error);
    return false;
  }
}

// Función para previsualizar archivo
function previewArchivo(filename) {
  console.log('Previsualizando archivo:', filename);
  
  // Determinar el tipo de archivo
  const extension = filename.split('.').pop().toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension);
  const isPDF = extension === 'pdf';
  const isText = ['txt', 'md', 'html', 'css', 'js', 'json', 'xml'].includes(extension);
  
  if (isImage) {
    // Para imágenes, mostrar directamente
    Swal.fire({
      title: `Vista previa: ${filename}`,
      imageUrl: `/archivos/${filename}`,
      imageWidth: '100%',
      imageHeight: 'auto',
      imageAlt: filename,
      width: '800px',
      showConfirmButton: false,
      showCloseButton: true
    });
  } else if (isPDF) {
    // Para PDFs, abrir en nueva pestaña
    window.open(`/archivos/${filename}`, '_blank');
    Swal.fire({
      title: 'PDF abierto',
      text: `El archivo "${filename}" se ha abierto en una nueva pestaña`,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
  } else if (isText) {
    // Para archivos de texto, intentar cargar y mostrar contenido
    previewTextFile(filename);
  } else {
    // Para otros tipos de archivo, mostrar opción de descarga
    Swal.fire({
      title: 'Archivo no previsualizable',
      html: `
        <p>El archivo "<strong>${filename}</strong>" no se puede previsualizar.</p>
        <p>Tipo de archivo: <code>${extension.toUpperCase()}</code></p>
        <div class="mt-3">
          <button class="btn btn-success me-2" onclick="downloadArchivo('${filename}')">
            <i class="fas fa-download me-2"></i>Descargar
          </button>
          <button class="btn btn-secondary" onclick="Swal.close()">
            <i class="fas fa-times me-2"></i>Cerrar
          </button>
        </div>
      `,
      icon: 'info',
      showConfirmButton: false,
      showCloseButton: true
    });
  }
}

// Función para previsualizar archivos de texto
async function previewTextFile(filename) {
  try {
    Swal.fire({
      title: 'Cargando archivo...',
      text: 'Obteniendo contenido del archivo',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    const response = await fetch(`/archivos/${filename}`);
    if (response.ok) {
      const text = await response.text();
      
      // Limitar el texto si es muy largo
      const maxLength = 2000;
      const displayText = text.length > maxLength 
        ? text.substring(0, maxLength) + '\n\n... (archivo truncado, muy largo para mostrar)'
        : text;
      
      Swal.fire({
        title: `Vista previa: ${filename}`,
        html: `
          <div class="text-start">
            <div class="mb-3">
              <small class="text-muted">
                <i class="fas fa-info-circle me-1"></i>
                Archivo de texto (${text.length} caracteres)
              </small>
            </div>
            <pre class="text-start bg-light p-3 rounded" style="max-height: 400px; overflow-y: auto; font-size: 0.9em;">${displayText}</pre>
            <div class="mt-3 text-center">
              <button class="btn btn-success me-2" onclick="downloadArchivo('${filename}')">
                <i class="fas fa-download me-2"></i>Descargar completo
              </button>
              <button class="btn btn-secondary" onclick="Swal.close()">
                <i class="fas fa-times me-2"></i>Cerrar
              </button>
            </div>
          </div>
        `,
        width: '800px',
        showConfirmButton: false,
        showCloseButton: true
      });
    } else {
      throw new Error('No se pudo cargar el archivo');
    }
  } catch (error) {
    console.error('Error al previsualizar archivo de texto:', error);
    Swal.fire({
      title: 'Error al previsualizar',
      text: `No se pudo cargar el archivo "${filename}"`,
      icon: 'error'
    });
  }
}

// Función para descargar archivo (simplificada)
function downloadArchivo(filename) {
  console.log('Descargando archivo:', filename);
  
  try {
    // Crear enlace de descarga
    const link = document.createElement('a');
    link.href = `/archivos/${filename}`;
    link.download = filename;
    link.target = '_blank';
    
    // Agregar al DOM y hacer clic
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Mostrar notificación de éxito
    Swal.fire({
      title: '✅ Descarga iniciada',
      text: `El archivo "${filename}" se está descargando`,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
    
  } catch (error) {
    console.error('Error al descargar archivo:', error);
    
    // Mostrar error con opción de descarga manual
    Swal.fire({
      title: '❌ Error en la descarga',
      html: `
        <p>No se pudo descargar automáticamente "${filename}".</p>
        <p>Puedes intentar descargarlo manualmente:</p>
        <div class="mt-3">
          <a href="/archivos/${filename}" target="_blank" class="btn btn-primary">
            <i class="fas fa-download me-2"></i>Descargar Manualmente
          </a>
        </div>
      `,
      icon: 'warning',
      showConfirmButton: false,
      showCloseButton: true
    });
  }
}

// Función para mostrar modal de exportación a Excel
function showExportModal() {
  console.log('Mostrando modal de exportación...');
  
  // Obtener fecha actual para el rango por defecto
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  
  const fechaDesde = lastMonth.toISOString().split('T')[0];
  const fechaHasta = today.toISOString().split('T')[0];
  
  // Crear contenido del modal
  const modalContent = `
    <div class="text-start">
      <div class="mb-4">
        <h6 class="text-success mb-3">
          <i class="fas fa-file-csv me-2"></i>
          Exportar Oficios a CSV
        </h6>
        <p class="text-muted small mb-0">Selecciona el rango de fechas para exportar los registros</p>
      </div>
      
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label fw-bold">Fecha Desde:</label>
          <input type="date" id="exportFechaDesde" class="form-control" value="${fechaDesde}" required>
        </div>
        <div class="col-md-6">
          <label class="form-label fw-bold">Fecha Hasta:</label>
          <input type="date" id="exportFechaHasta" class="form-control" value="${fechaHasta}" required>
        </div>
      </div>
      
      <div class="mt-4">
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>
          <strong>Nota:</strong> La exportación incluirá todos los oficios del rango de fechas seleccionado, 
          independientemente de los filtros aplicados en la tabla.
        </div>
      </div>
      
      <div class="mt-4 text-center">
        <button class="btn btn-success me-2" onclick="exportarOficios()">
          <i class="fas fa-file-csv me-2"></i>
          Exportar a CSV
        </button>
        <button class="btn btn-secondary" onclick="Swal.close()">
          <i class="fas fa-times me-2"></i>
          Cancelar
        </button>
      </div>
    </div>
  `;
  
  // Mostrar modal con SweetAlert2
  Swal.fire({
    title: 'Exportar Oficios',
    html: modalContent,
    icon: 'info',
    width: '600px',
    showConfirmButton: false,
    showCloseButton: true,
    customClass: {
      container: 'export-modal-container'
    }
  });
}

// Función para exportar oficios a Excel
async function exportarOficios() {
  console.log('Iniciando exportación a Excel...');
  
  // Obtener fechas del modal
  const fechaDesde = document.getElementById('exportFechaDesde').value;
  const fechaHasta = document.getElementById('exportFechaHasta').value;
  
  // Validar fechas
  if (!fechaDesde || !fechaHasta) {
    Swal.fire('❌ Error', 'Por favor selecciona ambas fechas', 'error');
    return;
  }
  
  if (fechaDesde > fechaHasta) {
    Swal.fire('❌ Error', 'La fecha de inicio no puede ser mayor que la fecha final', 'error');
    return;
  }
  
  try {
            // Mostrar loading
        Swal.fire({
          title: 'Exportando...',
          text: 'Generando archivo CSV, por favor espera',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
    
    // Realizar petición de exportación
    const response = await fetch('/api/oficios/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fechaDesde,
        fechaHasta
      })
    });
    
    if (response.ok) {
      // Obtener el blob del archivo
      const blob = await response.blob();
      
      // Crear nombre del archivo con fecha
      const fechaExport = new Date().toISOString().split('T')[0];
      const nombreArchivo = `oficios_${fechaDesde}_a_${fechaHasta}_${fechaExport}.csv`;
      
      // Crear URL del blob y descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nombreArchivo;
      
      // Agregar al DOM y hacer clic
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar URL
      window.URL.revokeObjectURL(url);
      
      // Cerrar loading y mostrar éxito
      Swal.close();
              Swal.fire({
          title: '✅ Exportación Completada',
          html: `
            <p>El archivo CSV se ha descargado correctamente.</p>
            <p><strong>Nombre:</strong> ${nombreArchivo}</p>
            <p><strong>Rango:</strong> ${fechaDesde} a ${fechaHasta}</p>
          `,
          icon: 'success',
          confirmButtonText: 'Perfecto'
        });
      
    } else {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error en la exportación');
    }
    
  } catch (error) {
    console.error('Error en la exportación:', error);
    Swal.close();
    
    let errorMessage = 'Error al exportar los oficios';
    if (error.message) {
      errorMessage = error.message;
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
    }
    
    Swal.fire('❌ Error', errorMessage, 'error');
  }
}

// Función alternativa para descargar archivos (método directo)
function downloadFileDirect(filename) {
  console.log('Descarga directa de archivo:', filename);
  
  try {
    // Crear enlace de descarga directa
    const link = document.createElement('a');
    link.href = `/archivos/${filename}`;
    link.download = filename;
    link.target = '_blank';
    
    // Agregar al DOM y hacer clic
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Mostrar notificación
    Swal.fire({
      title: '✅ Descarga iniciada',
      text: `El archivo "${filename}" se está descargando`,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
    
  } catch (error) {
    console.error('Error en descarga directa:', error);
    
    // Mostrar error con opción de descarga manual
    Swal.fire({
      title: '❌ Error en la descarga',
      html: `
        <p>No se pudo descargar automáticamente "${filename}".</p>
        <p>Puedes intentar descargarlo manualmente:</p>
        <div class="mt-3">
          <a href="/archivos/${filename}" target="_blank" class="btn btn-primary">
            <i class="fas fa-download me-2"></i>Descargar Manualmente
          </a>
        </div>
      `,
      icon: 'warning',
      showConfirmButton: false,
      showCloseButton: true
    });
  }
}

// Función para abrir modal de edición
function openEditModal(oficio) {
  console.log('Abriendo modal de edición para:', oficio.noOficio);
  
  // Buscar el modal existente
  const modal = document.getElementById('modalOficio');
  if (!modal) {
    console.error('Modal no encontrado');
    Swal.fire({
      title: 'Error',
      text: 'No se encontró el modal de edición',
      icon: 'error'
    });
    return;
  }
  
  // Cambiar el título del modal
  const modalTitle = modal.querySelector('.modal-title');
  if (modalTitle) {
    modalTitle.innerHTML = `<i class="fas fa-edit me-2"></i>Editar Oficio ${oficio.noOficio}`;
  }
  
  // Cambiar el botón de envío
  const submitBtn = modal.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Actualizar Oficio';
    submitBtn.classList.remove('btn-primary-custom');
    submitBtn.classList.add('btn-warning');
  }
  
  // Poblar los campos del formulario
  populateFormFields(oficio);
  
  // Cambiar el action del formulario para edición
  const form = modal.querySelector('form');
  if (form) {
    form.action = `/api/updateOficio/${oficio._id}`;
    form.method = 'POST';
    
    // Agregar campo oculto para el ID
    let idField = form.querySelector('input[name="oficioId"]');
    if (!idField) {
      idField = document.createElement('input');
      idField.type = 'hidden';
      idField.name = 'oficioId';
      form.appendChild(idField);
    }
    idField.value = oficio._id;
  }
  
  // Mostrar el modal sin afectar el layout
  openModalWithoutLayoutChange(modal);
}

// Función para poblar los campos del formulario
function populateFormFields(oficio) {
  console.log('Poblando campos con datos:', oficio);
  
  // Mapeo de campos del oficio a los campos del formulario
  const fieldMappings = {
    'noOficio': 'noOficio',
    'fecha': 'fecha',
    'tipoCorrespondencia': 'tipoCorrespondencia',
    'status': 'status',
    'institucion': 'institucion',
    'asunto': 'asunto',
    'tipoRespuesta': 'tipoRespuesta',
    'departamentoTurnado': 'departamentoTurnado',
    'observaciones': 'observaciones'
  };
  
  // Poblar cada campo
  Object.entries(fieldMappings).forEach(([oficioField, formField]) => {
    const field = document.querySelector(`[name="${formField}"]`);
    if (field && oficio[oficioField] !== undefined) {
      if (field.type === 'select-one') {
        // Para campos select
        field.value = oficio[oficioField];
        // Trigger change event para actualizar la UI
        field.dispatchEvent(new Event('change'));
      } else if (field.type === 'checkbox' || field.type === 'radio') {
        // Para checkboxes y radios
        if (Array.isArray(oficio[oficioField])) {
          // Si es un array (como departamentoTurnado)
          oficio[oficioField].forEach(value => {
            const checkbox = document.querySelector(`[name="${formField}"][value="${value}"]`);
            if (checkbox) checkbox.checked = true;
          });
        } else {
          field.checked = oficio[oficioField] === field.value;
        }
      } else {
        // Para campos de texto normales
        field.value = oficio[oficioField] || '';
      }
    }
  });
  
  // Manejar campos especiales
  handleSpecialFields(oficio);
}

// Función para manejar campos especiales
function handleSpecialFields(oficio) {
  // Manejar archivos existentes
  const archivosContainer = document.querySelector('#archivoActualContainer');
  if (archivosContainer && oficio.archivos && oficio.archivos.length > 0) {
    const listaArchivos = archivosContainer.querySelector('#listaArchivosActuales');
    if (listaArchivos) {
      listaArchivos.innerHTML = '';
      
      oficio.archivos.forEach(archivo => {
        const archivoDiv = document.createElement('div');
        archivoDiv.className = 'archivo-item bg-light border rounded px-2 py-1 d-flex align-items-center';
        archivoDiv.dataset.nombre = archivo;
        
        archivoDiv.innerHTML = `
          <span class="me-2 text-primary">${archivo}</span>
          <button type="button" class="btn btn-sm btn-outline-danger btn-eliminar-archivo">
            <i class="fas fa-times"></i>
          </button>
        `;
        
        listaArchivos.appendChild(archivoDiv);
      });
      
      archivosContainer.style.display = 'block';
      archivosContainer.dataset.archivosAEliminar = JSON.stringify([]); // reset
    }
  }
  
  // Manejar fecha (convertir a formato YYYY-MM-DD para input date)
  const fechaField = document.querySelector('[name="fecha"]');
  if (fechaField && oficio.fecha) {
    const fecha = new Date(oficio.fecha);
    const fechaFormateada = fecha.toISOString().split('T')[0];
    fechaField.value = fechaFormateada;
  }
}

// Función para eliminar archivo existente
function removeExistingFile(button, filename) {
  if (confirm(`¿Estás seguro de que quieres eliminar el archivo "${filename}"?`)) {
    button.closest('.archivo-item').remove();
    
    // Agregar el archivo a la lista de archivos a eliminar
    const archivoContainer = document.getElementById('archivoActualContainer');
    if (archivoContainer) {
      const archivosAEliminar = JSON.parse(archivoContainer.dataset.archivosAEliminar || '[]');
      archivosAEliminar.push(filename);
      archivoContainer.dataset.archivosAEliminar = JSON.stringify(archivosAEliminar);
    }
  }
}

// Event listener para eliminar archivos visualmente
document.addEventListener('click', function(e) {
  if (e.target.closest('.btn-eliminar-archivo')) {
    const item = e.target.closest('.archivo-item');
    const nombre = item.dataset.nombre;
    const contenedor = document.getElementById('archivoActualContainer');
    if (contenedor) {
      const aEliminar = JSON.parse(contenedor.dataset.archivosAEliminar || '[]');
      aEliminar.push(nombre);
      contenedor.dataset.archivosAEliminar = JSON.stringify(aEliminar);
      item.remove();
    }
  }
});

// Agregar estilos CSS personalizados para el modal de archivos y paginación
function addArchivosModalStyles() {
  const styleId = 'archivos-modal-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .archivos-modal-container .swal2-popup {
        max-width: 90vw !important;
      }
      
      .archivos-lista .archivo-item {
        transition: all 0.2s ease;
        border-left: 4px solid #dee2e6 !important;
      }
      
      .archivos-lista .archivo-item:hover {
        border-left-color: #007bff !important;
        box-shadow: 0 2px 8px rgba(0,123,255,0.15);
        transform: translateX(2px);
      }
      
      .archivos-lista .archivo-item .btn-group .btn {
        border-radius: 0.375rem !important;
        margin-left: 0.25rem;
      }
      
      .archivos-lista .archivo-item .btn-group .btn:first-child {
        margin-left: 0;
      }
      
      .archivos-lista .archivo-item .text-truncate {
        max-width: 300px;
      }
      
             /* Estilos para la paginación */
       .page-item.active .page-link {
         color: white !important;
         font-weight: bold !important;
       }
       
       .page-item.active .page-link:hover {
         color: white !important;
       }
       
              .page-link {
         transition: all 0.2s ease;
       }
       
       /* Estilos para el modal de exportación */
       .export-modal-container .swal2-popup {
         max-width: 90vw !important;
       }
       
       .export-modal-container .form-control {
         border-radius: 0.375rem !important;
         border: 1px solid #dee2e6 !important;
       }
       
       .export-modal-container .form-control:focus {
         border-color: #198754 !important;
         box-shadow: 0 0 0 0.2rem rgba(25, 135, 84, 0.25) !important;
       }
       
       .export-modal-container .btn-success {
         background-color: #198754 !important;
         border-color: #198754 !important;
         transition: all 0.2s ease;
       }
       
       .export-modal-container .btn-success:hover {
         background-color: #157347 !important;
         border-color: #157347 !important;
         transform: translateY(-1px);
       }
       
       @media (max-width: 768px) {
         .archivos-lista .archivo-item .btn-group .btn span {
           display: none !important;
         }
         
         .archivos-lista .archivo-item .text-truncate {
           max-width: 200px;
         }
         
         .export-modal-container .swal2-popup {
           width: 95vw !important;
           margin: 10px !important;
         }
       }
    `;
    document.head.appendChild(style);
  }
}

// Event listener para el formulario
document.addEventListener('DOMContentLoaded', function() {
  console.log('Configurando event listeners para el formulario...');
  
  // Agregar estilos personalizados
  addArchivosModalStyles();
  
  // Esperar un poco para asegurar que Bootstrap esté cargado
  setTimeout(() => {
    initializeFormHandlers();
  }, 100);
});

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
  
  const formOficio = document.getElementById('formOficio');
  if (formOficio) {
    console.log('Formulario encontrado, agregando event listener');
    formOficio.addEventListener('submit', handleFormSubmit);
    
    
  } else {
    console.error('Formulario no encontrado');
  }
  
  // Event listener para el botón de nuevo oficio
  const btnNuevoOficio = document.getElementById('btnNuevoOficio');
  if (btnNuevoOficio) {
    console.log('Botón nuevo oficio encontrado, agregando event listener');
    btnNuevoOficio.addEventListener('click', function() {
      console.log('Botón nuevo oficio clickeado');
      resetModal();
      // Abrir modal manualmente si es necesario
      const modal = document.getElementById('modalOficio');
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
    console.error('Botón nuevo oficio no encontrado');
  }
  
  // Event listener adicional para el modal
  const modal = document.getElementById('modalOficio');
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
  
  console.log('Manejadores del formulario inicializados');
  
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



// Función de debug para verificar el estado del formulario
function debugFormState() {
  console.log('=== DEBUG DEL FORMULARIO ===');
  
  const form = document.getElementById('formOficio');
  if (!form) {
    console.error('Formulario no encontrado');
    return;
  }
  
  console.log('Formulario encontrado:', form);
  console.log('Action:', form.action);
  console.log('Method:', form.method);
  
  // Verificar campos obligatorios
  const requiredFieldNames = ['noOficio', 'tipoCorrespondencia', 'asunto'];
  console.log('Campos obligatorios:', requiredFieldNames);
  
     requiredFieldNames.forEach(fieldName => {
     const field = form.querySelector(`[name="${fieldName}"]`);
     if (field) {
       console.log(`Campo ${fieldName}:`, {
         value: field.value,
         type: field.type,
         valid: field.value.trim().length > 0
       });
     } else {
       console.error(`Campo obligatorio ${fieldName} no encontrado`);
     }
   });
  
  // Verificar departamentos seleccionados
  const departamentosSeleccionados = Array.from(document.querySelectorAll('input[name="departamentoTurnado"]:checked')).map(cb => cb.value);
  console.log('Departamentos seleccionados:', departamentosSeleccionados);
  
  // Verificar archivos
  const fileInput = form.querySelector('input[type="file"]');
  if (fileInput) {
    console.log('Archivos seleccionados:', fileInput.files.length);
  }
  
  console.log('=== FIN DEBUG ===');
}

// Función para probar el formulario
function testFormSubmission() {
  console.log('Probando envío del formulario...');
  
  const form = document.getElementById('formOficio');
  if (form) {
    // Simular envío
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);
  } else {
    console.error('Formulario no encontrado para la prueba');
  }
}

// Función para manejar el envío del formulario
async function handleFormSubmit(e) {
  e.preventDefault();
  console.log('Formulario enviado');
  
  const formData = new FormData(this);
  const oficioId = formData.get('oficioId');
  
  console.log('ID del oficio:', oficioId ? 'Edición' : 'Nuevo registro');
  
  // Validar campos requeridos (solo los obligatorios)
  const requiredFields = ['noOficio', 'tipoCorrespondencia', 'asunto'];
  const missingFields = [];
  
  requiredFields.forEach(fieldName => {
    const field = this.querySelector(`[name="${fieldName}"]`);
    if (field && !field.value.trim()) {
      missingFields.push(fieldName);
    }
  });
  
  if (missingFields.length > 0) {
    // Mapear nombres de campos a nombres más amigables
    const fieldNameMap = {
      'noOficio': 'Número de Oficio',
      'tipoCorrespondencia': 'Tipo de Correspondencia',
      'asunto': 'Asunto'
    };
    
    const friendlyNames = missingFields.map(field => fieldNameMap[field] || field);
    Swal.fire('❌ Error', `Por favor completa los siguientes campos obligatorios: ${friendlyNames.join(', ')}`, 'error');
    return;
  }
  
  // Agregar departamentos seleccionados
  const departamentos = Array.from(document.querySelectorAll('input[name="departamentoTurnado"]:checked')).map(cb => cb.value);
  formData.delete('departamentoTurnado');
  formData.append('departamentoTurnado', JSON.stringify(departamentos));
  
  console.log('Departamentos seleccionados:', departamentos);
  
  // Enviar lista de archivos eliminados
  const archivoContainer = document.getElementById('archivoActualContainer');
  if (archivoContainer && archivoContainer.dataset.archivosAEliminar) {
    formData.append('archivosAEliminar', archivoContainer.dataset.archivosAEliminar);
    console.log('Archivos a eliminar:', archivoContainer.dataset.archivosAEliminar);
  }
  
  const url = oficioId ? `/api/updateOficio/${oficioId}` : '/api/createOficio';
  const method = oficioId ? 'PUT' : 'POST';
  
  console.log('Enviando a:', url, 'método:', method);
  
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
    
    const res = await fetch(url, {
      method,
      body: formData
    });
    
    console.log('Respuesta del servidor:', res.status, res.statusText);
    
    const data = await res.json();
    console.log('Datos de respuesta:', data);
    
    if (res.ok) {
      // Cerrar loading
      Swal.close();
      
      // Cerrar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('modalOficio'));
      if (modal) {
        modal.hide();
      }
      
      // Limpiar padding del body después de cerrar el modal
      setTimeout(() => {
        cleanModalBodyPadding();
      }, 100);
      
      // Recargar tabla y estadísticas
      if (typeof loadOficios === 'function') {
        loadOficios(currentPage);
      }
      if (typeof loadStats === 'function') {
        loadStats();
      }
      
      // Resetear formulario
      this.reset();
      
      // Mostrar mensaje de éxito
      Swal.fire('✅ Éxito', data.message || 'Oficio guardado correctamente', 'success');
    } else {
      throw new Error(data.message || `Error del servidor: ${res.status}`);
    }
  } catch (err) {
    console.error('Error al enviar formulario:', err);
    Swal.close(); // Cerrar loading en caso de error
    
    let errorMessage = 'Error al guardar el oficio';
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
  
  const modal = document.getElementById('modalOficio');
  if (modal) {
    // Resetear título
    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) {
      modalTitle.innerHTML = '<i class="fas fa-plus me-2"></i>Registrar Nuevo Oficio';
    }
    
    // Resetear botón
    const submitBtn = modal.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Guardar Oficio';
      submitBtn.classList.remove('btn-warning');
      submitBtn.classList.add('btn-primary-custom');
    }
    
    // Resetear formulario
    const form = modal.querySelector('form');
    if (form) {
      form.reset();
      form.action = '/api/createOficio';
      form.method = 'POST';
      
      // Remover campo oculto del ID
      const idField = form.querySelector('input[name="oficioId"]');
      if (idField) {
        idField.remove();
      }
      
      
    }
    
    // Ocultar contenedor de archivos actuales
    const archivoContainer = document.getElementById('archivoActualContainer');
    if (archivoContainer) {
      archivoContainer.style.display = 'none';
      archivoContainer.dataset.archivosAEliminar = JSON.stringify([]);
    }
    
    // Limpiar checkboxes
    document.querySelectorAll('input[name="departamentoTurnado"]').forEach(cb => {
      cb.checked = false;
    });
    
    // Limpiar campo de archivos
    const fileInput = form.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
    
    // Limpiar el padding-right del body que Bootstrap agrega
    cleanModalBodyPadding();
    
    console.log('Modal reseteado correctamente');
  } else {
    console.error('Modal no encontrado para resetear');
  }
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
