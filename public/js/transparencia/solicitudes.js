class SolicitudesManager {
  constructor() {
    this.items = [];
    this.editandoId = null;
  this.q = '';
  this.pagina = 1;
  this.limite = 10;
  this.fechaDesde = '';
  this.fechaHasta = '';
  this.recurso = ''; // '', 'con', 'sin'
  this.estado = ''; // '', 'porVencer5', 'vencidas'
    this.init();
  }

  async init() {
    this.setupEvents();
  await Promise.all([this.cargar(), this.cargarStats()]);
  }

  setupEvents() {
    const btnNueva = document.getElementById('btnNuevaSolicitud');
    const buscar = document.getElementById('buscarSolicitud');
    const form = document.getElementById('formSolicitud');
    const fDesde = document.getElementById('fDesde');
    const fHasta = document.getElementById('fHasta');
  const limit = document.getElementById('limitSelect');
  const btnExportar = document.getElementById('btnExportarSolicitudes');
  const modalEl = document.getElementById('modalSolicitud');
  const btnAplicarFiltros = document.getElementById('btnAplicarFiltros');
  const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');
  const filtroRecurso = document.getElementById('filterRecursoRevision');
  const cardTotal = document.getElementById('cardTotal');
  const cardConRecurso = document.getElementById('cardConRecurso');
  const cardPorVencer = document.getElementById('cardPorVencer');
  const cardVencidas = document.getElementById('cardVencidas');

    if (btnNueva) btnNueva.addEventListener('click', () => this.abrirModal());
    if (buscar) buscar.addEventListener('input', () => { this.q = buscar.value.trim(); this.pagina = 1; this.cargar(); });
    if (form) form.addEventListener('submit', (e) => this.guardar(e));
    // Las fechas se aplican con botón como en oficios
    if (btnAplicarFiltros) btnAplicarFiltros.addEventListener('click', () => {
      this.fechaDesde = fDesde?.value || '';
      this.fechaHasta = fHasta?.value || '';
  this.recurso = filtroRecurso?.value || '';
      this.pagina = 1;
  this.cargar();
  this.cargarStats();
    });
    if (btnLimpiarFiltros) btnLimpiarFiltros.addEventListener('click', () => {
      if (fDesde) fDesde.value = '';
      if (fHasta) fHasta.value = '';
      const buscar = document.getElementById('buscarSolicitud');
      if (buscar) buscar.value = '';
      this.q = '';
      this.fechaDesde = '';
      this.fechaHasta = '';
  if (filtroRecurso) filtroRecurso.value = '';
  this.recurso = '';
  this.estado = '';
      this.pagina = 1;
  this.cargar();
  this.cargarStats();
    });
  if (limit) limit.addEventListener('change', () => { this.limite = parseInt(limit.value) || 10; this.pagina = 1; this.cargar(); });
  if (btnExportar) btnExportar.addEventListener('click', () => this.mostrarModalExportar());

    // Click en tarjetas de estadísticas
    const handleEstadoClick = async (estado) => {
      // Mapas especiales: cardTotal limpia todo; cardConRecurso aplica recurso
      if (estado === 'todos') {
        this.q = '';
        this.estado = '';
        this.recurso = '';
        if (fDesde) fDesde.value = '';
        if (fHasta) fHasta.value = '';
        const buscar = document.getElementById('buscarSolicitud');
        if (buscar) buscar.value = '';
      } else if (estado === 'conRecurso') {
        this.estado = '';
        this.recurso = 'con';
      } else {
        this.recurso = '';
        this.estado = estado; // 'porVencer5' | 'vencidas'
      }
      this.pagina = 1;
      await this.cargar();
      await this.cargarStats();
    };

    cardTotal?.addEventListener('click', () => handleEstadoClick('todos'));
    cardConRecurso?.addEventListener('click', () => handleEstadoClick('conRecurso'));
    cardPorVencer?.addEventListener('click', () => handleEstadoClick('porVencer5'));
    cardVencidas?.addEventListener('click', () => handleEstadoClick('vencidas'));

    // Al cerrar modal, limpiar input de archivos y contenedor de archivos actuales
    if (modalEl) {
      modalEl.addEventListener('hidden.bs.modal', () => {
        const fileInput = document.getElementById('archivos');
        if (fileInput) {
          try { fileInput.value = ''; } catch (_) {}
        }
        const cont = document.getElementById('archivoActualContainer');
        const lista = document.getElementById('listaArchivosActuales');
        if (lista) lista.innerHTML = '';
        if (cont) cont.style.display = 'none';
        this._archivosAEliminar = new Set();
      });
    }
  }

  async cargar() {
    const loading = document.getElementById('loadingSol');
    const sin = document.getElementById('sinSolicitudes');
    const tbody = document.getElementById('tablaSolicitudes');
    if (loading) loading.style.display = 'block';
    try {
      const params = new URLSearchParams({
        pagina: this.pagina,
        limite: this.limite
      });
      if (this.q) params.append('q', this.q);
      if (this.fechaDesde) params.append('fechaDesde', this.fechaDesde);
      if (this.fechaHasta) params.append('fechaHasta', this.fechaHasta);
  if (this.recurso) params.append('recurso', this.recurso);
  if (this.estado) params.append('estado', this.estado);

  const res = await fetch('/api/transparencia/solicitudes?' + params.toString());
      const data = await res.json();
      this.items = Array.isArray(data?.items) ? data.items : [];
      this.paginacion = data?.paginacion || { pagina: 1, total: this.items.length, totalPaginas: 1 };
      this.renderTabla();
      this.renderPaginacion();
      if (sin) sin.style.display = this.items.length ? 'none' : 'block';
    } catch (_) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error al cargar</td></tr>';
    } finally {
      if (loading) loading.style.display = 'none';
    }
  }

  async cargarStats() {
    try {
      const params = new URLSearchParams();
  if (this.q) params.append('q', this.q);
  if (this.fechaDesde) params.append('fechaDesde', this.fechaDesde);
      if (this.fechaHasta) params.append('fechaHasta', this.fechaHasta);
      if (this.recurso) params.append('recurso', this.recurso);
      const res = await fetch('/api/transparencia/solicitudes/stats?' + params.toString());
      if (!res.ok) return;
      const data = await res.json();
      const totalEl = document.getElementById('totalSolicitudes');
      const conEl = document.getElementById('conRecurso');
      const por5El = document.getElementById('porVencer5');
  const vencidasEl = document.getElementById('vencidasSinCumplir');
      if (totalEl) totalEl.textContent = data?.total ?? '-';
      if (conEl) conEl.textContent = data?.conRecurso ?? '-';
      if (por5El) por5El.textContent = data?.porVencer5 ?? '-';
  if (vencidasEl) vencidasEl.textContent = data?.vencidasSinCumplir ?? '-';
    } catch(_) {}
  }

  renderTabla() {
    const tbody = document.getElementById('tablaSolicitudes');
    if (!tbody) return;
    if (this.items.length === 0) {
      tbody.innerHTML = '';
      return;
    }
    tbody.innerHTML = this.items.map(it => `
      <tr>
        <td class="text-center"><strong>${this._esc(it.folio)}</strong></td>
        <td class="text-center">${this._fmtFecha(it.fechaRecepcion)}</td>
        <td class="text-center">${this._esc(it.medioRecepcion)}</td>
        <td>${this._esc(it.solicitanteNombre)}</td>
        <td>${this._esc(it.areaResponsable)}</td>
        <td class="text-center">${this._fmtFecha(it.fechaLimiteRespuesta) || '-'}</td>
        <td class="text-center">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-info" title="Ver" onclick="solicitudesManager.ver('${it._id}')"><i class="fas fa-eye"></i></button>
            <button class="btn btn-outline-warning" title="Editar" onclick="solicitudesManager.editar('${it._id}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-outline-danger" title="Eliminar" onclick="solicitudesManager.eliminar('${it._id}')"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  abrirModal() {
    this.editandoId = null;
    const form = document.getElementById('formSolicitud');
    if (form) form.reset();
  // Limpiar estado de archivos/adjuntos y ocultar contenedor
  this._archivosAEliminar = new Set();
  const cont = document.getElementById('archivoActualContainer');
  const lista = document.getElementById('listaArchivosActuales');
  if (lista) lista.innerHTML = '';
  if (cont) cont.style.display = 'none';
  const fileInput = document.getElementById('archivos');
  if (fileInput) try { fileInput.value = ''; } catch (_) {}
    const titulo = document.getElementById('tituloModalSolicitud');
    if (titulo) titulo.textContent = 'Nueva solicitud';
    const modalEl = document.getElementById('modalSolicitud');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }

  renderPaginacion() {
  const ul = document.getElementById('pagination');
  const resumen = null; // se alinea a oficios: sin resumen textual
    if (!ul) return;
    const p = this.paginacion || { pagina: 1, totalPaginas: 1, total: this.items.length };
    let html = '';
    if (p.tieneAnterior) {
      html += `<li class="page-item"><a class="page-link" href="#" data-page="${p.pagina - 1}"><i class="fas fa-chevron-left"></i></a></li>`;
    }
    const start = Math.max(1, p.pagina - 2);
    const end = Math.min(p.totalPaginas || 1, p.pagina + 2);
    for (let i = start; i <= end; i++) {
      html += `<li class="page-item ${i === p.pagina ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    if (p.tieneSiguiente) {
      html += `<li class="page-item"><a class="page-link" href="#" data-page="${p.pagina + 1}"><i class="fas fa-chevron-right"></i></a></li>`;
    }
    ul.innerHTML = html;
    ul.querySelectorAll('a[data-page]')?.forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault();
      const n = parseInt(a.getAttribute('data-page'));
      if (!isNaN(n)) { this.pagina = n; this.cargar(); }
    }));
    // sin resumen
  }

  mostrarModalExportar() {
    // Usar filtros actuales si existen; si no, último mes a hoy
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    const defDesde = this.fechaDesde || lastMonth.toISOString().split('T')[0];
    const defHasta = this.fechaHasta || today.toISOString().split('T')[0];

    const html = `
      <div class="text-start">
        <div class="mb-3">
          <h6 class="text-success mb-2"><i class=\"fas fa-file-csv me-2\"></i>Exportar Solicitudes a CSV</h6>
          <p class="text-muted small mb-0">Selecciona el rango de fechas para exportar los registros</p>
        </div>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label fw-bold">Fecha Desde:</label>
            <input type="date" id="exportSolDesde" class="form-control" value="${defDesde}" required>
          </div>
          <div class="col-md-6">
            <label class="form-label fw-bold">Fecha Hasta:</label>
            <input type="date" id="exportSolHasta" class="form-control" value="${defHasta}" required>
          </div>
        </div>
        <div class="mt-4 text-center">
          <button class="btn btn-success me-2" onclick="solicitudesManager.exportarSolicitudes()">
            <i class="fas fa-file-csv me-2"></i>Exportar a CSV
          </button>
          <button class="btn btn-secondary" onclick="Swal.close()">
            <i class="fas fa-times me-2"></i>Cancelar
          </button>
        </div>
      </div>`;

    if (window.Swal) {
      Swal.fire({ title: 'Exportar Solicitudes', html, icon: 'info', width: '600px', showConfirmButton: false, showCloseButton: true });
    } else {
      alert('Selecciona fechas en el modal (requiere SweetAlert2)');
    }
  }

  async exportarSolicitudes() {
    try {
      // Tomar fechas del modal
      const desdeEl = document.getElementById('exportSolDesde');
      const hastaEl = document.getElementById('exportSolHasta');
      const fechaDesde = desdeEl?.value || '';
      const fechaHasta = hastaEl?.value || '';
      if (!fechaDesde || !fechaHasta) {
        return window.Swal ? Swal.fire('❌ Error', 'Por favor selecciona ambas fechas', 'error') : alert('Selecciona ambas fechas');
      }
      if (fechaDesde > fechaHasta) {
        return window.Swal ? Swal.fire('❌ Error', 'La fecha de inicio no puede ser mayor que la final', 'error') : alert('Rango inválido');
      }

      const body = { fechaDesde, fechaHasta };
      const res = await fetch('/api/transparencia/solicitudes/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'Error al exportar');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const hoy = new Date().toISOString().slice(0,10);
      a.download = `solicitudes_${fechaDesde}_a_${fechaHasta}_${hoy}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      if (window.Swal) Swal.fire({ icon: 'success', title: 'Exportación lista', timer: 1200, showConfirmButton: false });
    } catch (err) {
      if (window.Swal) Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  }

  async ver(id) {
    const it = await this._fetchById(id);
    if (!it) return;
    if (window.Swal) {
      const html = `
        <div class="text-start">
          <p><strong>Folio:</strong> ${this._esc(it.folio)}</p>
          <p><strong>Fecha recepción:</strong> ${this._fmtFecha(it.fechaRecepcion)}</p>
          <p><strong>Medio:</strong> ${this._esc(it.medioRecepcion)}</p>
          <p><strong>Solicitante:</strong> ${this._esc(it.solicitanteNombre)}</p>
          <p><strong>Área responsable:</strong> ${this._esc(it.areaResponsable)}</p>
          <p><strong>Descripción:</strong><br>${this._esc(it.descripcionSolicitud)}</p>
          <p><strong>Asignación:</strong> ${this._fmtFecha(it.fechaAsignacion) || '-'}</p>
          <p><strong>Límite respuesta:</strong> ${this._fmtFecha(it.fechaLimiteRespuesta) || '-'}</p>
          <p><strong>Cumplimiento:</strong> ${this._fmtFecha(it.fechaCumplimiento) || '-'}</p>
          <p><strong>Satisfacción:</strong> ${it.satisfaccionCliente ? 'Sí' : 'No'}</p>
          <p><strong>Recurso revisión:</strong> ${it.recursoRevision ? 'Sí' : 'No'}</p>
          <p><strong>Observaciones:</strong><br>${this._esc(it.observaciones || '')}</p>
          ${Array.isArray(it.archivos) && it.archivos.length ? `<div><strong>Archivos:</strong><ul>${it.archivos.map(a => `<li><a href="/archivos/${a}" target="_blank">${this._esc(a)}</a></li>`).join('')}</ul></div>` : ''}
        </div>`;
      await Swal.fire({ title: 'Detalle de la solicitud', html, width: 800, confirmButtonText: 'Cerrar' });
    } else {
      alert(it.folio);
    }
  }

  async editar(id) {
    const it = await this._fetchById(id);
    if (!it) return;
    this.editandoId = id;
    const titulo = document.getElementById('tituloModalSolicitud');
    if (titulo) titulo.textContent = 'Editar solicitud';
    // Llenar form
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
    set('folio', it.folio);
    set('fechaRecepcion', this._toInputDate(it.fechaRecepcion));
    set('medioRecepcion', it.medioRecepcion);
    set('solicitanteNombre', it.solicitanteNombre);
    set('descripcionSolicitud', it.descripcionSolicitud);
    set('areaResponsable', it.areaResponsable);
    set('fechaAsignacion', this._toInputDate(it.fechaAsignacion));
    set('fechaLimiteRespuesta', this._toInputDate(it.fechaLimiteRespuesta));
    set('fechaCumplimiento', this._toInputDate(it.fechaCumplimiento));
    const sat = document.getElementById('satisfaccionCliente'); if (sat) sat.checked = !!it.satisfaccionCliente;
    const rr = document.getElementById('recursoRevision'); if (rr) rr.checked = !!it.recursoRevision;
    const obs = document.getElementById('observaciones'); if (obs) obs.value = it.observaciones || '';
    // limpiar input de archivos antes de agregar nuevos
    const fileInput = document.getElementById('archivos');
    if (fileInput) {
      try { fileInput.value = ''; } catch (_) {
        // fallback: clonar input si no se pudo limpiar
        const clone = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(clone, fileInput);
      }
    }
    // Archivos actuales
    this._archivosAEliminar = new Set();
    const cont = document.getElementById('archivoActualContainer');
    const lista = document.getElementById('listaArchivosActuales');
    if (lista) lista.innerHTML = '';
    if (Array.isArray(it.archivos) && it.archivos.length) {
      if (cont) cont.style.display = 'block';
      it.archivos.forEach((nombre) => {
        const pill = document.createElement('div');
        pill.className = 'badge bg-light text-dark border d-inline-flex align-items-center p-2';
        pill.style.gap = '8px';
        pill.innerHTML = `
          <a href="/archivos/${this._esc(nombre)}" target="_blank" class="text-decoration-none">
            <i class="fas fa-paperclip me-1"></i>${this._esc(nombre)}
          </a>
          <button type="button" class="btn btn-sm btn-outline-danger ms-1" title="Eliminar" aria-label="Eliminar archivo">
            <i class="fas fa-times"></i>
          </button>`;
        const btn = pill.querySelector('button');
        btn.addEventListener('click', () => {
          this._archivosAEliminar.add(nombre);
          pill.remove();
          // ocultar contenedor si queda vacío
          if (lista && lista.children.length === 0 && cont) cont.style.display = 'none';
        });
        if (lista) lista.appendChild(pill);
      });
    } else if (cont) {
      cont.style.display = 'none';
    }
    // abrir modal
    const modal = new bootstrap.Modal(document.getElementById('modalSolicitud'));
    modal.show();
  }

  async guardar(e) {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    // normalizar booleans
    data.set('satisfaccionCliente', document.getElementById('satisfaccionCliente').checked);
    data.set('recursoRevision', document.getElementById('recursoRevision').checked);
    // incluir lista de archivos a eliminar en updates
    if (this.editandoId && this._archivosAEliminar && this._archivosAEliminar.size) {
      data.append('archivosAEliminar', JSON.stringify(Array.from(this._archivosAEliminar)));
    }
    const url = this.editandoId ? `/api/transparencia/solicitudes/${this.editandoId}` : '/api/transparencia/solicitudes';
    const method = this.editandoId ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, body: data });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || 'Error');
      // cerrar modal
      const modalEl = document.getElementById('modalSolicitud');
      bootstrap.Modal.getInstance(modalEl)?.hide();
  // limpiar input de archivos y estado luego de guardar
  const fileInput2 = document.getElementById('archivos');
  if (fileInput2) { try { fileInput2.value = ''; } catch (_) {} }
  this._archivosAEliminar = new Set();
      await this.cargar();
      await this.cargarStats();
      if (window.Swal) Swal.fire({ icon: 'success', title: 'Guardado', timer: 1400, showConfirmButton: false });
    } catch (err) {
      if (window.Swal) Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  }

  async eliminar(id) {
    if (window.Swal) {
      const r = await Swal.fire({ title: '¿Eliminar?', icon: 'warning', showCancelButton: true });
      if (!r.isConfirmed) return;
    } else if (!confirm('¿Eliminar?')) return;
    try {
      const res = await fetch(`/api/transparencia/solicitudes/${id}`, { method: 'DELETE' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.message || 'Error al eliminar');
      await this.cargar();
      await this.cargarStats();
      if (window.Swal) Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1200, showConfirmButton: false });
    } catch (err) {
      if (window.Swal) Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  }

  async _fetchById(id) {
    try {
      const res = await fetch(`/api/transparencia/solicitudes/${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (_) { return null; }
  }

  _fmtFecha(f) {
    if (!f) return '';
    // Si viene como string con formato ISO/fecha (YYYY-MM-DD...), usar la parte de fecha tal cual para evitar desplazamientos por zona horaria
    if (typeof f === 'string') {
      const m = f.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) {
        const [, y, mo, d] = m;
        return `${d}/${mo}/${y}`; // dd/mm/yyyy
      }
    }
    // Fallback: formatear usando componentes UTC para no mover el día
    const d = new Date(f);
    if (isNaN(d)) return '';
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yy = d.getUTCFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  _toInputDate(f) { return f ? new Date(f).toISOString().slice(0,10) : ''; }
  _esc(s='') { return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])); }
}

let solicitudesManager;
document.addEventListener('DOMContentLoaded', () => { solicitudesManager = new SolicitudesManager(); });
