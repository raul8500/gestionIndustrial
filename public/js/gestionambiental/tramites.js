// Funcionalidad para el módulo de trámites de gestión ambiental

class TramitesManager {
    constructor() {
        this.tramites = [];
        this.opcionesFiltros = {};
        this.tramiteEditando = null;
        this.paginaActual = 1;
        this.totalPaginas = 1;
    this.userInfo = null; // info del usuario autenticado (para permisos)
    this._filterPortal = null; // portal para sugerencias del filtro de empresa
    this._filterPortalVisible = false;
    this._onPortalReposition = null;
        // Catálogo dinámico de técnicos (se carga desde API)
        this.catalogoTecnicos = []; // [{_id, nombre, status}]
        // Mapa legado para mostrar nombres de registros antiguos que usan códigos numéricos
        this.legacyTecnicosMap = {
            1: 'QFB Rosa',
            2: 'Lic Agustin',
            3: 'Ing. Sandra',
            4: 'Ing. Anahi',
            5: 'Ing. Diana',
            6: 'Ing. Daniel',
            7: 'Ing. hector',
            8: 'Ing. Gustavo',
            9: 'Lic. Alma',
            10: 'Ing. Jonathan',
            11: 'Ing Aline',
            12: 'Ing. Ivan'
        };
    this.socket = null;
        this.init();
    }

    async init() {
        await this.obtenerUsuarioActual();
    await this.cargarOpcionesFiltros();
    await this.cargarTecnicosDinamicos();
        await this.cargarTramites();
        this.setupEventListeners();
    this.setupRealtime();
    }

    // Obtener info del usuario autenticado para validar permisos de UI
    async obtenerUsuarioActual() {
        try {
            const res = await fetch('/api/verifySesion');
            if (res.ok) {
                this.userInfo = await res.json();
            } else {
                this.userInfo = {};
            }
        } catch (_) {
            this.userInfo = {};
        }
    }

    setupEventListeners() {
        // Event listener para el formulario
        const formTramite = document.getElementById('formTramite');
        if (formTramite) {
            formTramite.addEventListener('submit', (e) => this.manejarEnvioFormulario(e));
        }

        // Event listeners para filtros
        const btnAplicarFiltros = document.getElementById('btnAplicarFiltros');
        const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');
    const limitSelect = document.getElementById('limitSelect');
    // Empresa filter search
    const filterEmpresaInput = document.getElementById('filterEmpresaInput');
    const filterEmpresaId = document.getElementById('filterEmpresaId');
    const filterEmpresaSuggestions = document.getElementById('filterEmpresaSuggestions');

        if (btnAplicarFiltros) {
            btnAplicarFiltros.addEventListener('click', () => this.aplicarFiltros());
        }

        if (btnLimpiarFiltros) {
            btnLimpiarFiltros.addEventListener('click', () => this.limpiarFiltros());
        }

        if (limitSelect) {
            limitSelect.addEventListener('change', () => {
                this.paginaActual = 1;
                this.cargarTramites();
            });
        }

        // Búsqueda por empresa en filtros
        if (filterEmpresaInput) {
            let debounce;
            filterEmpresaInput.addEventListener('input', (e) => {
                if (filterEmpresaId) filterEmpresaId.value = '';
                clearTimeout(debounce);
                const value = e.target.value;
                debounce = setTimeout(() => this.buscarEmpresas(value, {
                    targetSuggestionsId: 'filterEmpresaSuggestions'
                }), 250);
            });
            filterEmpresaInput.addEventListener('focus', () => this.mostrarSugerenciasEmpresas([], 'filterEmpresaSuggestions'));
            filterEmpresaInput.addEventListener('blur', () => setTimeout(() => this.ocultarSugerenciasEmpresas('filterEmpresaSuggestions'), 200));
        }

        // Event listener para búsqueda en tiempo real
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.paginaActual = 1;
                    this.cargarTramites();
                }, 500);
            });
        }

        // Event listener para cerrar modal al hacer clic fuera
        window.onclick = (event) => {
            const modal = document.getElementById('modalTramite');
            if (event.target === modal) {
                this.cerrarModal();
            }
        };

        // Event listener para búsqueda de empresas por código/nombre
        const inputEmpresa = document.getElementById('empresa');
        const hiddenEmpresaId = document.getElementById('empresaId');
        if (inputEmpresa) {
            let debounce;
            inputEmpresa.addEventListener('input', (e) => {
                if (hiddenEmpresaId) hiddenEmpresaId.value = '';
                clearTimeout(debounce);
                const value = e.target.value;
                debounce = setTimeout(() => this.buscarEmpresas(value), 250);
            });
            inputEmpresa.addEventListener('focus', () => this.mostrarSugerenciasEmpresas());
            inputEmpresa.addEventListener('blur', () => {
                // Ocultar sugerencias después de un pequeño delay para permitir clic
                setTimeout(() => this.ocultarSugerenciasEmpresas(), 200);
            });
        }

        // Event listener para cerrar sugerencias al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.empresa-container')) {
                this.ocultarSugerenciasEmpresas();
            }
            if (!e.target.closest('.empresa-filter-container')) {
                this.ocultarSugerenciasEmpresas('filterEmpresaSuggestions');
            }
        });

        // Auto-cálculo: tiempoEstimadoSalida = fechaEntrada + 60 días hábiles
        const fechaEntradaInput = document.getElementById('fechaEntrada');
        const tiempoEstimadoSalidaInput = document.getElementById('tiempoEstimadoSalida');
        if (fechaEntradaInput && tiempoEstimadoSalidaInput) {
            const actualizarSalida = () => {
                const val = fechaEntradaInput.value;
                if (val) {
                    const out = this.calcularFechaSalida(val, 60);
                    tiempoEstimadoSalidaInput.value = out || '';
                } else {
                    tiempoEstimadoSalidaInput.value = '';
                }
            };
            fechaEntradaInput.addEventListener('change', actualizarSalida);
            fechaEntradaInput.addEventListener('input', actualizarSalida);
        }
    }

    // Conexión a WebSocket para actualizaciones en tiempo real
    setupRealtime() {
        if (!window.io) return;
        try {
            this.socket = io();
        } catch (e) {
            console.warn('No fue posible conectar con Socket.IO:', e?.message);
            return;
        }

        // Crear
        this.socket.on('tramite:create', (payload) => {
            const { tramite } = payload || {};
            if (!tramite) return;
            // Si el registro coincide con filtros visibles actuales, actualizamos la lista en memoria
            if (this._pasaFiltrosVisibles(tramite)) {
                this.tramites.unshift(tramite);
                // Limitar a la página visible; si excedes, recarga de servidor para coherencia
                if (this.tramites.length > 20) {
                    this.cargarTramites();
                } else {
                    this.renderizarTabla();
                    this.actualizarEstadisticas();
                }
            }
        });

        // Update
        this.socket.on('tramite:update', (payload) => {
            const { tramite } = payload || {};
            if (!tramite || !tramite._id) return;
            const idx = this.tramites.findIndex(t => t._id === tramite._id);
            if (idx >= 0) {
                // Si dejó de cumplir filtros, lo removemos; si cumple, lo reemplazamos
                if (!this._pasaFiltrosVisibles(tramite)) {
                    this.tramites.splice(idx, 1);
                } else {
                    this.tramites[idx] = tramite;
                }
                this.renderizarTabla();
                this.actualizarEstadisticas();
            } else {
                // Si cumple con filtros y no estaba, lo insertamos
                if (this._pasaFiltrosVisibles(tramite)) {
                    this.tramites.unshift(tramite);
                    this.renderizarTabla();
                    this.actualizarEstadisticas();
                }
            }
        });

        // Delete
        this.socket.on('tramite:delete', (payload) => {
            const { id } = payload || {};
            if (!id) return;
            const idx = this.tramites.findIndex(t => t._id === id);
            if (idx >= 0) {
                this.tramites.splice(idx, 1);
                this.renderizarTabla();
                this.actualizarEstadisticas();
            }
        });

        // Bloqueos en tiempo real
        this.socket.on('tramite:lock', ({ id, user }) => {
            const t = this.tramites.find(x => x._id === id);
            if (t) {
                t.lockedBy = user;
                t.lockedAt = new Date().toISOString();
                this.renderizarTabla();
            }
        });
        this.socket.on('tramite:unlock', ({ id }) => {
            const t = this.tramites.find(x => x._id === id);
            if (t) {
                t.lockedBy = null;
                t.lockedAt = null;
                this.renderizarTabla();
            }
        });
    }

    // Checar si un trámite pasa los filtros que el usuario tiene activos en la UI
    _pasaFiltrosVisibles(tramite) {
        try {
            const empresaId = document.getElementById('filterEmpresaId')?.value?.trim();
            const tipo = document.getElementById('filterTipo')?.value?.trim();
            const status = document.getElementById('filterStatus')?.value?.trim();
            const search = document.getElementById('searchInput')?.value?.trim().toLowerCase();

            if (empresaId && String(tramite.empresa?._id) !== empresaId) return false;
            if (tipo && tramite.tipoTramite !== tipo) return false;
            if (status && tramite.status !== status) return false;
            if (search) {
                const texto = [
                    tramite.folioOficialia,
                    tramite.empresa?.codigo,
                    tramite.empresa?.razonSocial,
                    tramite.observaciones
                ].filter(Boolean).join(' ').toLowerCase();
                if (!texto.includes(search)) return false;
            }
            return true;
        } catch (_) {
            return true;
        }
    }

    // Cargar opciones para los filtros
    async cargarOpcionesFiltros() {
        try {
            const response = await fetch('/api/gestionambiental/tramites/opciones-filtros');
            if (response.ok) {
                this.opcionesFiltros = await response.json();
                this.llenarSelectsFiltros();
                this.llenarSelectsFormulario();
            }
        } catch (error) {
            console.error('Error al cargar opciones:', error);
            this.mostrarNotificacion('Error al cargar opciones de filtros', 'error');
        }
    }

    // Llenar los selects de filtros
    llenarSelectsFiltros() {
        const selectTipo = document.getElementById('filterTipo');
        const selectStatus = document.getElementById('filterStatus');

        // Llenar tipos de trámite
        if (selectTipo) {
            this.opcionesFiltros.tiposTramite?.forEach(tipo => {
                const option = document.createElement('option');
                option.value = tipo;
                option.textContent = tipo;
                selectTipo.appendChild(option);
            });
        }

        // Llenar status
        if (selectStatus) {
            this.opcionesFiltros.status?.forEach(status => {
                const option = document.createElement('option');
                option.value = status;
                option.textContent = status;
                selectStatus.appendChild(option);
            });
        }
    }

    // Llenar los selects del formulario
    llenarSelectsFormulario() {
    const selectTipo = document.getElementById('tipoTramite');
    const selectAsunto = document.getElementById('asuntoEspecifico');
    const selectStatus = document.getElementById('status');

    if (!selectTipo || !selectAsunto || !selectStatus) return;

        // Limpiar opciones existentes
        selectTipo.innerHTML = '<option value="">Seleccionar tipo</option>';
        selectAsunto.innerHTML = '<option value="">Seleccionar asunto</option>';
        selectStatus.innerHTML = '<option value="">Seleccionar status</option>';
        
    // Técnicos ahora se eligen con checkboxes dinámicos, no con input de texto

        // Llenar tipos de trámite
        this.opcionesFiltros.tiposTramite?.forEach(tipo => {
            const option = document.createElement('option');
            option.value = tipo;
            option.textContent = tipo;
            selectTipo.appendChild(option);
        });

        // Llenar asuntos específicos
        this.opcionesFiltros.asuntosEspecificos?.forEach(asunto => {
            const option = document.createElement('option');
            option.value = asunto;
            option.textContent = asunto;
            selectAsunto.appendChild(option);
        });

        // Llenar status
        this.opcionesFiltros.status?.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            selectStatus.appendChild(option);
        });
    }

    // Cargar técnicos dinámicos y pintar checkboxes en el formulario
    async cargarTecnicosDinamicos() {
        try {
            const res = await fetch('/api/gestionambiental/tecnicos-ambientales?soloActivos=1');
            if (!res.ok) throw new Error('No se pudieron cargar técnicos');
            const lista = await res.json();
            this.catalogoTecnicos = Array.isArray(lista) ? lista : [];
            this.renderizarCheckboxTecnicos();
        } catch (e) {
            console.warn('Técnicos dinámicos no disponibles:', e?.message);
            this.catalogoTecnicos = [];
            this.renderizarCheckboxTecnicos();
        }
    }

    // Pintar checkboxes de técnicos en el contenedor del formulario
    renderizarCheckboxTecnicos(seleccionados = []) {
        const cont = document.getElementById('tecnicosLista');
        if (!cont) return;
        const setSel = new Set(seleccionados.map(String));
        if (!this.catalogoTecnicos.length) {
            cont.innerHTML = '<div class="col-12"><em class="text-muted">No hay técnicos activos disponibles</em></div>';
            return;
        }
        const cols = this.catalogoTecnicos.map(tec => {
            const id = String(tec._id);
            const checked = setSel.has(id) ? 'checked' : '';
            const inputId = `tec_${id}`;
            return `
                <div class="col-md-4">
                  <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="${inputId}" name="tecnicosIds" value="${id}" ${checked}>
                    <label class="form-check-label" for="${inputId}">${this._escapeHtml(tec.nombre || '')}</label>
                  </div>
                </div>`;
        }).join('');
        cont.innerHTML = cols;
    }

    // Cargar trámites
    async cargarTramites() {
        try {
            // Mostrar loading
            const loadingIndicator = document.getElementById('loadingIndicator');
            const tableContent = document.getElementById('tableContent');
            const noResults = document.getElementById('noResults');
            
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            if (tableContent) tableContent.style.display = 'none';
            if (noResults) noResults.style.display = 'none';

            const params = new URLSearchParams({
                page: this.paginaActual,
                limit: 20
            });

            // Agregar filtros si están aplicados
            const filtroEmpresa = document.getElementById('filterEmpresaId')?.value;
            const filtroTipo = document.getElementById('filterTipo')?.value;
            const filtroStatus = document.getElementById('filterStatus')?.value;
            const filtroBusqueda = document.getElementById('searchInput')?.value;

            if (filtroEmpresa) params.append('empresa', filtroEmpresa);
            if (filtroTipo) params.append('tipoTramite', filtroTipo);
            if (filtroStatus) params.append('status', filtroStatus);
            if (filtroBusqueda) params.append('search', filtroBusqueda);

            const response = await fetch(`/api/gestionambiental/tramites/?${params}`);
            if (response.ok) {
                const data = await response.json();
                this.tramites = data.tramites || [];
                this.totalPaginas = data.totalPages || 1;
                
                // Ocultar loading y mostrar contenido
                if (loadingIndicator) loadingIndicator.style.display = 'none';
                
                if (this.tramites.length > 0) {
                    if (tableContent) tableContent.style.display = 'block';
                    this.renderizarTabla();
                    this.renderizarPaginacion();
                    this.actualizarEstadisticas();
                } else {
                    if (noResults) noResults.style.display = 'block';
                }
            } else {
                throw new Error('Error en la respuesta del servidor');
            }
        } catch (error) {
            console.error('Error al cargar trámites:', error);
            this.mostrarNotificacion('Error al cargar trámites', 'error');
            
            // Ocultar loading y mostrar mensaje de error
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            const noResults = document.getElementById('noResults');
            if (noResults) {
                noResults.innerHTML = `
                    <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                    <h5 class="text-danger">Error al cargar trámites</h5>
                    <p class="text-muted">${error.message}</p>
                `;
                noResults.style.display = 'block';
            }
        }
    }

    // Renderizar tabla de trámites
    renderizarTabla() {
        const tbody = document.getElementById('tablaTramites');
        if (!tbody) return;
        
        if (this.tramites.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
                        <p class="text-muted mb-0">No se encontraron trámites con los filtros aplicados</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.tramites.map(tramite => `
            <tr>
                <td class="text-center"><strong>${tramite.folioOficialia}</strong></td>
                <td>
                    <div>
                        <strong>${tramite.empresa.codigo}</strong><br>
                        <small class="text-muted">${tramite.empresa.razonSocial}</small>
                    </div>
                </td>
                <td class="text-center">${this.formatearFecha(tramite.fechaEntrada)}</td>
                <td class="text-center">${tramite.tipoTramite}</td>
                <td class="text-center">${tramite.asuntoEspecifico}</td>
                <td class="text-center">
                    <span class="status-badge status-${this.obtenerClaseStatus(tramite.status)}">
                        ${tramite.status}
                    </span>
                </td>
                <td class="text-center">
                    ${(() => {
                        const arr = Array.isArray(tramite.tecnicos) ? tramite.tecnicos : [];
                        // si viene poblado: objetos con nombre, si no: ids
                        if (arr.length === 0) return '<em class="text-muted">Sin asignar</em>';
                        const etiquetas = arr.map(t => {
                            if (typeof t === 'object') return t.nombre || '';
                            const found = this.catalogoTecnicos.find(x => String(x._id)===String(t));
                            if (found) return found.nombre || '';
                            const num = Number(t);
                            if (!Number.isNaN(num) && this.legacyTecnicosMap[num]) return this.legacyTecnicosMap[num];
                            return String(t);
                        });
                        return etiquetas.filter(Boolean).join(', ');
                    })()}
                </td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-info btn-sm" onclick="tramitesManager.verTramite('${tramite._id}')" title="Ver">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning btn-sm" ${tramite.lockedBy ? 'disabled title="Bloqueado"' : ''} onclick="tramitesManager.editarTramite('${tramite._id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" ${tramite.lockedBy ? 'disabled title="Bloqueado"' : ''} onclick="tramitesManager.eliminarTramite('${tramite._id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                        ${this.userInfo && this.userInfo.puedeCrearUsuarios ? `
                        <button class="btn btn-outline-secondary btn-sm" onclick="tramitesManager.verCambiosTramite('${tramite._id}')" title="Ver cambios">
                            <i class=\"fas fa-history\"></i>
                        </button>` : ''}
                    </div>
                    ${tramite.lockedBy ? '<div><span class="badge bg-secondary mt-1">Bloqueado</span></div>' : ''}
                </td>
            </tr>
        `).join('');
    }

    // Mostrar auditoría del último cambio
    async verCambiosTramite(id) {
        // Buscar en memoria primero
        let t = this.tramites.find(x => x._id === id);
        try {
            if (!t) {
                const res = await fetch(`/api/gestionambiental/tramites/${id}`);
                if (res.ok) t = await res.json();
            }
        } catch (_) {}

        const quien = t?.lastModifiedBy ? (t.lastModifiedBy.name || t.lastModifiedBy.username || '-') : '-';
        const cuando = t?.lastModifiedAt ? new Date(t.lastModifiedAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
        const que = t?.lastChange || 'Sin registros';

        if (window.Swal) {
            await Swal.fire({
                title: 'Último cambio',
                html: `
                    <div class="text-start">
                        <p><strong>Quién:</strong> ${this._escapeHtml(quien)}</p>
                        <p><strong>Cuándo:</strong> ${this._escapeHtml(cuando)}</p>
                        <p><strong>Qué cambió:</strong><br>${this._escapeHtml(que)}</p>
                    </div>
                `,
                icon: 'info',
                confirmButtonText: 'Cerrar'
            });
        } else {
            alert(`Último cambio\nQuién: ${quien}\nCuándo: ${cuando}\nQué: ${que}`);
        }
    }

    // Obtener clase CSS para el status
    obtenerClaseStatus(status) {
        const statusMap = {
            'Ingresado al area': 'ingresado',
            'Turnado con tecnico evaluador': 'turnado',
            'Proceso de firma con jefe de departamento': 'firma',
            'Turnado a direccion': 'direccion',
            'Resguardo para notificar': 'resguardo',
            'Notificado': 'notificado'
        };
        return statusMap[status] || 'ingresado';
    }

    // Formatear fecha
    formatearFecha(fecha) {
        return new Date(fecha).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Calcular fecha de salida sumando días hábiles (excluye sábados y domingos)
    // Entrada y salida en formato 'YYYY-MM-DD'. Si la entrada es inválida, regresa ''
    calcularFechaSalida(fechaEntradaStr, diasHabiles = 60) {
        if (!fechaEntradaStr) return '';
        const d = new Date(fechaEntradaStr + 'T00:00:00');
        if (isNaN(d.getTime())) return '';
        let added = 0;
        // No contamos el día de entrada; empezamos en el siguiente día calendario
        const cur = new Date(d);
        cur.setDate(cur.getDate() + 1);
        while (added < diasHabiles) {
            const day = cur.getDay(); // 0=Dom, 6=Sáb
            if (day !== 0 && day !== 6) {
                added++;
                if (added === diasHabiles) break;
            }
            cur.setDate(cur.getDate() + 1);
        }
        // Formato YYYY-MM-DD
        const yyyy = cur.getFullYear();
        const mm = String(cur.getMonth() + 1).padStart(2, '0');
        const dd = String(cur.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    // Renderizar paginación
    renderizarPaginacion() {
        const paginacion = document.getElementById('pagination');
        if (!paginacion) return;
        
        if (this.totalPaginas <= 1) {
            paginacion.innerHTML = '';
            return;
        }

        let html = '';
        
        // Botón anterior
        const prevDisabled = this.paginaActual === 1 ? 'disabled' : '';
        html += `
            <li class="page-item ${prevDisabled ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="tramitesManager.cambiarPagina(${this.paginaActual - 1}); return false;">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

        // Números de página
        for (let i = 1; i <= this.totalPaginas; i++) {
            if (i === 1 || i === this.totalPaginas || (i >= this.paginaActual - 2 && i <= this.paginaActual + 2)) {
                const activeClass = i === this.paginaActual ? 'active' : '';
                html += `
                    <li class="page-item ${activeClass}">
                        <a class="page-link" href="#" onclick="tramitesManager.cambiarPagina(${i}); return false;">
                            ${i}
                        </a>
                    </li>
                `;
            } else if (i === this.paginaActual - 3 || i === this.paginaActual + 3) {
                html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        // Botón siguiente
        const nextDisabled = this.paginaActual === this.totalPaginas ? 'disabled' : '';
        html += `
            <li class="page-item ${nextDisabled ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="tramitesManager.cambiarPagina(${this.paginaActual + 1}); return false;">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;

        paginacion.innerHTML = html;
    }

    // Cambiar página
    cambiarPagina(pagina) {
        if (pagina < 1 || pagina > this.totalPaginas) return;
        this.paginaActual = pagina;
        this.cargarTramites();
    }

    // Aplicar filtros
    aplicarFiltros() {
        this.paginaActual = 1;
        this.cargarTramites();
    }

    // Limpiar filtros
    limpiarFiltros() {
    const filtroEmpresa = document.getElementById('filterEmpresaId');
    const filtroEmpresaInput = document.getElementById('filterEmpresaInput');
        const filtroTipo = document.getElementById('filterTipo');
        const filtroStatus = document.getElementById('filterStatus');
        const filtroBusqueda = document.getElementById('searchInput');

    if (filtroEmpresa) filtroEmpresa.value = '';
    if (filtroEmpresaInput) filtroEmpresaInput.value = '';
        if (filtroTipo) filtroTipo.value = '';
        if (filtroStatus) filtroStatus.value = '';
        if (filtroBusqueda) filtroBusqueda.value = '';

        this.paginaActual = 1;
        this.cargarTramites();
    }

    // Abrir modal para nuevo trámite
    abrirModalNuevo() {
        this.tramiteEditando = null;
        const modalTitulo = document.getElementById('modalTitulo');
        const formTramite = document.getElementById('formTramite');
        const folioOficialia = document.getElementById('folioOficialia');
        const empresa = document.getElementById('empresa');
    const hiddenEmpresaId = document.getElementById('empresaId');

        if (modalTitulo) modalTitulo.textContent = 'Nuevo Trámite';
        if (formTramite) formTramite.reset();
        if (folioOficialia) folioOficialia.value = '';
        if (empresa) {
            empresa.value = '';
            delete empresa.dataset.empresaId;
        }
        if (hiddenEmpresaId) hiddenEmpresaId.value = '';

    // Limpiar checkboxes de técnicos
    document.querySelectorAll('#tecnicosLista input[name="tecnicosIds"]').forEach(ch => ch.checked = false);

        this.mostrarModal();
    }

    // Mostrar modal
    mostrarModal() {
        const modal = document.getElementById('modalTramite');
        if (modal) {
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();
            // Al cerrarse por cualquier motivo (Cancelar, X, backdrop), liberar el lock
            const handler = this.onModalHidden.bind(this);
            // Usamos once:true para evitar múltiple registro en siguientes aperturas
            modal.addEventListener('hidden.bs.modal', handler, { once: true });
        }
    }

    // Handler al cerrarse el modal (cualquier vía): liberar bloqueo y limpiar estado
    onModalHidden() {
        const id = this.tramiteEditando;
        if (this._tieneLock && id) {
            fetch(`/api/gestionambiental/tramites/${id}/unlock`, { method: 'POST' })
              .then(() => {
                  const t = this.tramites.find(x => x._id === id);
                  if (t) {
                      t.lockedBy = null;
                      t.lockedAt = null;
                      this.renderizarTabla();
                  }
              })
              .catch(() => {});
        }
        this._tieneLock = false;
        this.tramiteEditando = null;
        // Cerrar dropdowns de sugerencias si quedaron abiertos
        this.ocultarSugerenciasEmpresas('empresaSuggestions');
        this.ocultarSugerenciasEmpresas('filterEmpresaSuggestions');
    }

    // Cerrar modal
    cerrarModal() {
        const modal = document.getElementById('modalTramite');
        if (modal) {
            const bootstrapModal = bootstrap.Modal.getInstance(modal);
            if (bootstrapModal) {
                bootstrapModal.hide();
            }
            // Fallback: limpiar manualmente backdrop y clases si quedaran
            setTimeout(() => {
                // Remover cualquier backdrop residual
                document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
                // Remover clase modal-open del body
                document.body.classList.remove('modal-open');
                // Resetear estilos inline que bloquean el scroll
                document.body.style.removeProperty('padding-right');
                document.body.style.removeProperty('overflow');
                // Asegurar que el modal no quede en estado show
                modal.classList.remove('show');
                modal.setAttribute('aria-hidden', 'true');
                modal.style.display = 'none';
            }, 150);
        }
        // Liberar lock si corresponde
        const id = this.tramiteEditando;
        if (this._tieneLock && id) {
            fetch(`/api/gestionambiental/tramites/${id}/unlock`, { method: 'POST' })
              .then(() => {
                  // Reflejar al instante en la tabla sin esperar al socket
                  const t = this.tramites.find(x => x._id === id);
                  if (t) {
                      t.lockedBy = null;
                      t.lockedAt = null;
                      this.renderizarTabla();
                  }
              })
              .catch(()=>{});
        }
        this._tieneLock = false;
        this.tramiteEditando = null;
    }

    // Manejar envío del formulario
    async manejarEnvioFormulario(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Validar folio requerido
        if (!data.folioOficialia || !data.folioOficialia.trim()) {
            this.mostrarNotificacion('El folio de oficialía es obligatorio', 'error');
            return;
        }

        // Empresa: usar hidden empresaId si existe, de lo contrario enviar el texto (código o nombre)
        const empresaIdHidden = document.getElementById('empresaId');
        const empresaInput = document.getElementById('empresa');
        if (empresaIdHidden && empresaIdHidden.value) {
            data.empresa = empresaIdHidden.value;
        } else if (empresaInput && empresaInput.value) {
            const texto = empresaInput.value.trim();
            const codigo = texto.includes(' - ') ? texto.split(' - ')[0] : texto;
            data.empresa = codigo; // el backend aceptará ID o código
        } else {
            this.mostrarNotificacion('Por favor escribe o selecciona una empresa', 'error');
            return;
        }
        
    // Establecer técnicos predefinidos (placeholder; en backend son IDs si aplica)
    data.tecnicos = [];
        
        // Convertir fechas (type=date) a ISO en 00:00 local
        if (data.fechaEntrada) {
            const d = new Date(data.fechaEntrada + 'T00:00:00');
            data.fechaEntrada = d.toISOString();
        }
        if (data.tiempoEstimadoSalida) {
            const d2 = new Date(data.tiempoEstimadoSalida + 'T00:00:00');
            data.tiempoEstimadoSalida = d2.toISOString();
        }

        // Técnicos seleccionados (checkboxes dinámicos): enviar IDs
        const tecSel = Array.from(document.querySelectorAll('#tecnicosLista input[name="tecnicosIds"]:checked')).map(ch => ch.value);
        data.tecnicos = tecSel;

        try {
            const url = this.tramiteEditando 
                ? `/api/gestionambiental/tramites/${this.tramiteEditando}`
                : '/api/gestionambiental/tramites/';
            
            const method = this.tramiteEditando ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.cerrarModal();
                await this.cargarTramites();
                this.mostrarNotificacion(
                    this.tramiteEditando ? 'Trámite actualizado correctamente' : 'Trámite creado correctamente',
                    'success'
                );
            } else {
                const error = await response.json();
                this.mostrarNotificacion('Error: ' + error.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error al procesar la solicitud', 'error');
        }
    }

    // Ver trámite
    async verTramite(id) {
        try {
            const response = await fetch(`/api/gestionambiental/tramites/${id}`);
            if (response.ok) {
                const tramite = await response.json();
                this.mostrarDetalleTramite(tramite);
            }
        } catch (error) {
            console.error('Error al obtener trámite:', error);
            this.mostrarNotificacion('Error al obtener el trámite', 'error');
        }
    }

    // Mostrar detalle del trámite
    mostrarDetalleTramite(tramite) {
    if (window.Swal) {
            // Ocultar dropdowns de sugerencias que pudieran estar abiertos
            this.ocultarSugerenciasEmpresas('empresaSuggestions');
            this.ocultarSugerenciasEmpresas('filterEmpresaSuggestions');
            const empresa = tramite.empresa || {};
            const tecnicosArr = Array.isArray(tramite.tecnicos) ? tramite.tecnicos : [];
            const tecnicosTexto = tecnicosArr.length
                ? tecnicosArr.map(t => {
                    if (typeof t === 'object') return t.nombre || '';
                    const found = this.catalogoTecnicos.find(x => String(x._id)===String(t));
                    if (found) return found.nombre || '';
                    const num = Number(t);
                    if (!Number.isNaN(num) && this.legacyTecnicosMap[num]) return this.legacyTecnicosMap[num];
                    return String(t);
                  }).filter(Boolean).join(', ')
                : 'Sin asignar';

                        const fechaEntrada = tramite.fechaEntrada ? this.formatearFecha(tramite.fechaEntrada) : '-';
                        const fechaSalida = tramite.tiempoEstimadoSalida ? this.formatearFecha(tramite.tiempoEstimadoSalida) : '-';

                        const direccion = empresa.direccion || {};
                        const rep = empresa.representanteLegal || {};

                        const html = `
                                <div class="text-start">
                                    <div class="mb-3">
                                        <h5 class="mb-2">Información del Trámite</h5>
                                        <div class="row g-2">
                                            <div class="col-md-6"><strong>Folio:</strong> ${tramite.folioOficialia || '-'}</div>
                                            <div class="col-md-6"><strong>Fecha de entrada:</strong> ${fechaEntrada}</div>
                                            <div class="col-md-6"><strong>Tipo:</strong> ${tramite.tipoTramite || '-'}</div>
                                            <div class="col-md-6"><strong>Asunto:</strong> ${tramite.asuntoEspecifico || '-'}</div>
                                            <div class="col-md-6">
                                                <strong>Status:</strong> <span class="status-badge status-${this.obtenerClaseStatus(tramite.status)}">${tramite.status || '-'}</span>
                                            </div>
                                            <div class="col-md-6"><strong>Número de páginas:</strong> ${tramite.numeroPaginas ?? '-'}</div>
                                            <div class="col-md-6"><strong>Tiempo estimado de salida:</strong> ${fechaSalida}</div>
                                            <div class="col-12"><strong>Observaciones del trámite:</strong><br>${tramite.observaciones ? this._escapeHtml(tramite.observaciones) : '<em class="text-muted">Sin observaciones</em>'}</div>
                                            <div class="col-12"><strong>Observaciones de notificación:</strong><br>${tramite.observacionesNotificacion ? this._escapeHtml(tramite.observacionesNotificacion) : '<em class="text-muted">Sin observaciones de notificación</em>'}</div>
                                            <div class="col-12"><strong>Técnicos:</strong> ${this._escapeHtml(tecnicosTexto)}</div>
                                        </div>
                                    </div>
                                    <hr/>
                                    <div class="mb-2">
                                        <h5 class="mb-2">Información de la Empresa</h5>
                                        <div class="row g-2">
                                            <div class="col-md-6"><strong>Código:</strong> ${empresa.codigo || '-'}</div>
                                            <div class="col-md-6"><strong>Razón social:</strong> ${empresa.razonSocial || '-'}</div>
                                            <div class="col-md-6"><strong>Teléfono:</strong> ${empresa.telefono || '-'}</div>
                                            <div class="col-md-6"><strong>Correo:</strong> ${empresa.correo || '-'}</div>
                                            <div class="col-12"><strong>Dirección:</strong><br>
                                                ${[
                                                        direccion.calle,
                                                        direccion.noExterior,
                                                        direccion.noInterior ? `Int. ${direccion.noInterior}` : '',
                                                        direccion.colonia,
                                                        direccion.cp,
                                                        direccion.localidad,
                                                        direccion.municipio,
                                                        direccion.estado
                                                    ].filter(Boolean).join(', ') || '-'}
                                            </div>
                                            <div class="col-12"><strong>Representante Legal:</strong><br>
                                                ${[rep.nombre, rep.telefono, rep.correo].filter(Boolean).join(' • ') || '-'}
                                            </div>
                                        </div>
                                    </div>
                                </div>`;

                        Swal.fire({
                                title: 'Detalle del Trámite',
                                html,
                                width: 900,
                                showCloseButton: true,
                                showConfirmButton: false,
                                focusConfirm: false
                        });
                } else {
                        const mensaje = `Folio: ${tramite.folioOficialia}\nEmpresa: ${tramite.empresa?.razonSocial || '-'}\nTipo: ${tramite.tipoTramite || '-'}\nStatus: ${tramite.status || '-'}`;
                        alert(mensaje);
                }
    }

        // Utilidad simple para evitar HTML injection en textos
        _escapeHtml(str = '') {
                return String(str)
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#039;');
        }

    // Editar trámite
    async editarTramite(id) {
        try {
            // Bloquear primero
            const lockResp = await fetch(`/api/gestionambiental/tramites/${id}/lock`, { method: 'POST' });
            if (!lockResp.ok) {
                const err = await lockResp.json().catch(() => ({}));
                this.mostrarNotificacion(err.message || 'Otro usuario está editando este trámite', 'error');
                return;
            }
            const response = await fetch(`/api/gestionambiental/tramites/${id}`);
            if (response.ok) {
                const tramite = await response.json();
                this.tramiteEditando = id;
                this._tieneLock = true;
                
                this.llenarFormularioEdicion(tramite);
                this.mostrarModal();
            }
        } catch (error) {
            console.error('Error al obtener trámite:', error);
            this.mostrarNotificacion('Error al obtener el trámite', 'error');
        }
    }

    // Llenar formulario para edición
    llenarFormularioEdicion(tramite) {
        const modalTitulo = document.getElementById('modalTitulo');
        const folioOficialia = document.getElementById('folioOficialia');
    const empresa = document.getElementById('empresa');
    const hiddenEmpresaId = document.getElementById('empresaId');
        const fechaEntrada = document.getElementById('fechaEntrada');
        const tipoTramite = document.getElementById('tipoTramite');
        const asuntoEspecifico = document.getElementById('asuntoEspecifico');
        const status = document.getElementById('status');
        const numeroPaginas = document.getElementById('numeroPaginas');
        const tiempoEstimadoSalida = document.getElementById('tiempoEstimadoSalida');
        const observaciones = document.getElementById('observaciones');
    const inputTecnicos = document.getElementById('tecnicos');

        if (modalTitulo) modalTitulo.textContent = 'Editar Trámite';
        if (folioOficialia) folioOficialia.value = tramite.folioOficialia;
        if (empresa) {
            empresa.value = `${tramite.empresa.codigo} - ${tramite.empresa.razonSocial}`;
            empresa.dataset.empresaId = tramite.empresa._id;
        }
        if (hiddenEmpresaId) hiddenEmpresaId.value = tramite.empresa?._id || '';
        if (fechaEntrada) {
            fechaEntrada.value = tramite.fechaEntrada ? new Date(tramite.fechaEntrada).toISOString().slice(0,10) : '';
        }
        if (tipoTramite) tipoTramite.value = tramite.tipoTramite;
        if (asuntoEspecifico) asuntoEspecifico.value = tramite.asuntoEspecifico;
        if (status) status.value = tramite.status;
        if (numeroPaginas) numeroPaginas.value = tramite.numeroPaginas || '';
        if (tiempoEstimadoSalida) {
            const salidaStr = tramite.tiempoEstimadoSalida ? new Date(tramite.tiempoEstimadoSalida).toISOString().slice(0,10) : '';
            // Si viene vacío pero hay fechaEntrada, calcularla automáticamente
            if (!salidaStr && fechaEntrada && fechaEntrada.value) {
                tiempoEstimadoSalida.value = this.calcularFechaSalida(fechaEntrada.value, 60);
            } else {
                tiempoEstimadoSalida.value = salidaStr;
            }
        }
        if (observaciones) observaciones.value = tramite.observaciones || '';
        // Marcar técnicos seleccionados por código numérico
        // Marcar técnicos seleccionados por ID (si vienen poblados son objetos con _id)
        const seleccionados = Array.isArray(tramite.tecnicos) ? tramite.tecnicos.map(t => typeof t === 'object' ? String(t._id) : String(t)) : [];
        this.renderizarCheckboxTecnicos(seleccionados);
    }

    // Eliminar trámite
    async eliminarTramite(id) {
        // Confirmación con SweetAlert2 si está disponible
        let confirmado = true;
        if (window.Swal) {
            const result = await Swal.fire({
                title: '¿Eliminar trámite?',
                text: 'Esta acción no se puede deshacer.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar',
                reverseButtons: true,
                focusCancel: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d'
            });
            confirmado = result.isConfirmed;
        } else {
            confirmado = confirm('¿Estás seguro de que quieres eliminar este trámite?');
        }
        if (!confirmado) return;

        try {
            const response = await fetch(`/api/gestionambiental/tramites/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.cargarTramites();
                this.mostrarNotificacion('Trámite eliminado correctamente', 'success');
            } else {
                const error = await response.json();
                this.mostrarNotificacion('Error: ' + error.message, 'error');
            }
        } catch (error) {
            console.error('Error al eliminar trámite:', error);
            this.mostrarNotificacion('Error al eliminar el trámite', 'error');
        }
    }

    // Mostrar notificación
    mostrarNotificacion(mensaje, tipo = 'info') {
        if (window.Swal) {
            const map = {
                success: { icon: 'success', title: 'Completado', timer: 1600 },
                error: { icon: 'error', title: 'Error', timer: 2200 },
                info: { icon: 'info', title: 'Información', timer: 1600 }
            };
            const cfg = map[tipo] || map.info;
            Swal.fire({
                icon: cfg.icon,
                title: cfg.title,
                text: mensaje,
                timer: cfg.timer,
                showConfirmButton: false,
                position: 'top',
                timerProgressBar: true
            });
        } else {
            // Fallback
            console[tipo === 'error' ? 'error' : 'log'](mensaje);
        }
    }

    // Actualizar estadísticas
    actualizarEstadisticas() {
        const totalTramites = document.getElementById('totalTramites');
        const tramitesPendientes = document.getElementById('tramitesPendientes');
        const tramitesCompletados = document.getElementById('tramitesCompletados');

        if (totalTramites) totalTramites.textContent = this.tramites.length;
        
        const pendientes = this.tramites.filter(t => t.status !== 'Notificado').length;
        if (tramitesPendientes) tramitesPendientes.textContent = pendientes;
        
        const completados = this.tramites.filter(t => t.status === 'Notificado').length;
        if (tramitesCompletados) tramitesCompletados.textContent = completados;

        // Estadísticas por status específico
        const idsPorStatus = {
            'Ingresado al area': 'statIngresado',
            'Turnado con tecnico evaluador': 'statTurnado',
            'Proceso de firma con jefe de departamento': 'statFirma',
            'Turnado a direccion': 'statDireccion',
            'Resguardo para notificar': 'statResguardo',
            'Notificado': 'statNotificado'
        };

        // Inicializar todos en cero
        const contadores = Object.fromEntries(Object.keys(idsPorStatus).map(k => [k, 0]));

        // Contar del conjunto actualmente cargado (considera filtros+paginación vigentes)
        for (const t of this.tramites) {
            if (t && typeof t.status === 'string' && contadores.hasOwnProperty(t.status)) {
                contadores[t.status] += 1;
            }
        }

        // Pintar en tarjetas si existen en el DOM
        for (const [status, elId] of Object.entries(idsPorStatus)) {
            const el = document.getElementById(elId);
            if (el) el.textContent = contadores[status] ?? 0;
        }
    }

    // Búsqueda de empresas
    async buscarEmpresas(query, opts = {}) {
        if (!query || query.length < 2) {
            this.ocultarSugerenciasEmpresas(opts.targetSuggestionsId);
            return;
        }

        try {
            const response = await fetch(`/api/gestionambiental/empresas/buscar?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const empresas = await response.json();
                this.mostrarSugerenciasEmpresas(empresas, opts.targetSuggestionsId);
            }
        } catch (error) {
            console.error('Error al buscar empresas:', error);
        }
    }

    // Mostrar sugerencias de empresas
    mostrarSugerenciasEmpresas(empresas = [], targetSuggestionsId) {
        const id = targetSuggestionsId || 'empresaSuggestions';

        // Si es el filtro superior, usar portal fijo fuera del contenedor para evitar recortes
        if (id === 'filterEmpresaSuggestions') {
            // Ocultar el contenedor original si existe
            const inlineDiv = document.getElementById(id);
            if (inlineDiv) inlineDiv.style.display = 'none';

            if (!empresas || empresas.length === 0) {
                this._hideFilterPortal();
                return;
            }

            const input = document.getElementById('filterEmpresaInput');
            if (!input) return;
            const html = empresas.map(empresa => `
                <div class="suggestion-item" data-empresa-id="${empresa._id}" data-empresa-codigo="${empresa.codigo}" data-empresa-nombre="${empresa.razonSocial}">
                    <div class="empresa-codigo">${empresa.codigo}</div>
                    <div class="empresa-nombre">${empresa.razonSocial}</div>
                </div>
            `).join('');

            this._ensureFilterPortal();
            this._filterPortal.innerHTML = html;
            this._positionFilterPortal();
            this._filterPortal.style.display = 'block';
            this._filterPortalVisible = true;

            // Delegar clicks
            this._filterPortal.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => this.seleccionarEmpresa(item, id));
            });

            // Reposicionar en scroll/resize
            if (!this._onPortalReposition) {
                this._onPortalReposition = () => {
                    if (this._filterPortalVisible) this._positionFilterPortal();
                };
                window.addEventListener('scroll', this._onPortalReposition, true);
                window.addEventListener('resize', this._onPortalReposition, true);
            }

            // Cerrar si se hace click fuera
            document.addEventListener('click', (e) => {
                if (this._filterPortalVisible) {
                    const container = this._filterPortal;
                    if (container && !container.contains(e.target) && !input.contains(e.target)) {
                        this._hideFilterPortal();
                    }
                }
            }, { once: true });
            return;
        }

        // Caso normal (modal o formulario de creación): usar el contenedor inline
        const suggestionsDiv = document.getElementById(id);
        if (!suggestionsDiv) return;

        if (!empresas || empresas.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        const html = empresas.map(empresa => `
            <div class="suggestion-item" data-empresa-id="${empresa._id}" data-empresa-codigo="${empresa.codigo}" data-empresa-nombre="${empresa.razonSocial}">
                <div class="empresa-codigo">${empresa.codigo}</div>
                <div class="empresa-nombre">${empresa.razonSocial}</div>
            </div>
        `).join('');

        suggestionsDiv.innerHTML = html;
        suggestionsDiv.style.display = 'block';
        suggestionsDiv.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => this.seleccionarEmpresa(item, id));
        });
    }

    // Ocultar sugerencias de empresas
    ocultarSugerenciasEmpresas(targetSuggestionsId) {
        const id = targetSuggestionsId || 'empresaSuggestions';
        if (id === 'filterEmpresaSuggestions') {
            this._hideFilterPortal();
            // También asegurar oculto el inline
            const inlineDiv = document.getElementById(id);
            if (inlineDiv) inlineDiv.style.display = 'none';
            return;
        }
        const suggestionsDiv = document.getElementById(id);
        if (suggestionsDiv) suggestionsDiv.style.display = 'none';
    }

    // Seleccionar empresa de las sugerencias
    seleccionarEmpresa(item, targetSuggestionsId) {
        const isFilter = targetSuggestionsId === 'filterEmpresaSuggestions';
        const inputEmpresa = document.getElementById(isFilter ? 'filterEmpresaInput' : 'empresa');
        const hiddenEmpresaId = document.getElementById(isFilter ? 'filterEmpresaId' : 'empresaId');
    const empresaId = item.dataset.empresaId;
        const empresaCodigo = item.dataset.empresaCodigo;
        const empresaNombre = item.dataset.empresaNombre;

        // Guardar el ID de la empresa en un campo oculto o en el dataset del input
    if (hiddenEmpresaId) hiddenEmpresaId.value = empresaId;
        inputEmpresa.value = `${empresaCodigo} - ${empresaNombre}`;
        
        this.ocultarSugerenciasEmpresas(targetSuggestionsId);
    }

    // Crear (si no existe) el portal fijo para sugerencias del filtro de empresa
    _ensureFilterPortal() {
        if (this._filterPortal && document.body.contains(this._filterPortal)) return;
        const div = document.createElement('div');
        div.id = 'filterEmpresaPortal';
        div.style.position = 'fixed';
        div.style.zIndex = '15000';
        div.style.background = 'white';
        div.style.border = '1px solid #dee2e6';
        div.style.borderTop = 'none';
        div.style.borderRadius = '0 0 8px 8px';
        div.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        div.style.display = 'none';
        // Sin max-height para que pueda salirse visualmente; el viewport limita
        // Añadir clases para heredar estilos de items
        div.className = 'suggestions-dropdown';
        document.body.appendChild(div);
        this._filterPortal = div;
    }

    // Posicionar el portal justo debajo del input del filtro
    _positionFilterPortal() {
        if (!this._filterPortal) return;
        const input = document.getElementById('filterEmpresaInput');
        if (!input) return;
        const rect = input.getBoundingClientRect();
        this._filterPortal.style.left = `${rect.left}px`;
        this._filterPortal.style.top = `${rect.bottom}px`;
        this._filterPortal.style.width = `${rect.width}px`;
        // Opcional: limitar altura al viewport disponible para evitar cortar por abajo
        const available = Math.max(100, window.innerHeight - rect.bottom - 10);
        this._filterPortal.style.maxHeight = `${available}px`;
        this._filterPortal.style.overflowY = 'auto';
    }

    // Ocultar y limpiar listeners del portal
    _hideFilterPortal() {
        if (this._filterPortal) this._filterPortal.style.display = 'none';
        this._filterPortalVisible = false;
    }
}

// Inicializar el manager cuando se cargue la página
let tramitesManager;

document.addEventListener('DOMContentLoaded', function() {
    tramitesManager = new TramitesManager();
    // Safety: liberar lock al salir o esconder pestaña por tiempo
    window.addEventListener('beforeunload', () => {
        if (tramitesManager && tramitesManager._tieneLock && tramitesManager.tramiteEditando) {
            navigator.sendBeacon && navigator.sendBeacon(`/api/gestionambiental/tramites/${tramitesManager.tramiteEditando}/unlock`);
        }
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && tramitesManager && tramitesManager._tieneLock && tramitesManager.tramiteEditando) {
            fetch(`/api/gestionambiental/tramites/${tramitesManager.tramiteEditando}/unlock`, { method: 'POST' }).catch(()=>{});
            tramitesManager._tieneLock = false;
        }
    });
});

// Funciones globales para los botones HTML
function abrirModalNuevo() {
    if (tramitesManager) tramitesManager.abrirModalNuevo();
}

function cerrarModal() {
    if (tramitesManager) tramitesManager.cerrarModal();
}

function aplicarFiltros() {
    if (tramitesManager) tramitesManager.aplicarFiltros();
}

function limpiarFiltros() {
    if (tramitesManager) tramitesManager.limpiarFiltros();
}

// Función para abrir modal desde el botón principal
document.addEventListener('DOMContentLoaded', function() {
    const btnNuevoTramite = document.getElementById('btnNuevoTramite');
    if (btnNuevoTramite) {
        btnNuevoTramite.addEventListener('click', () => {
            if (tramitesManager) tramitesManager.abrirModalNuevo();
        });
    }
});
