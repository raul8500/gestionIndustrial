// Notificaciones: listar trámites en "Resguardo para notificar" y permitir marcarlos como Notificado
(async function(){
  const tbody = document.getElementById('tablaNotificaciones');
  const ulPaginacion = document.getElementById('paginacionNoti');
  const resumen = document.getElementById('resumenNoti');
  const txtBuscar = document.getElementById('txtBuscar');
  const btnBuscar = document.getElementById('btnBuscar');
  let tecnicosCatalog = [];
  let page = 1;
  let limit = 10;
  let total = 0;
  let search = '';
  let debounceTimer = null;

  async function cargar() {
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Cargando...</td></tr>';
    try {
      const params = new URLSearchParams({ page, limit, status: 'Resguardo para notificar' });
      if (search && search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/gestionambiental/tramites/?${params.toString()}`);
      if (!res.ok) throw new Error('No se pudieron cargar los trámites');
      const data = await res.json();
      total = data.total || 0;
      page = data.page || page;
      limit = (data.limit || limit);
      render(data.tramites || []);
      renderPaginacion();
      renderResumen();
    } catch (e) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">${e.message}</td></tr>`;
    }
  }

  async function cargarCatalogoTecnicos(){
    try{
      if (tecnicosCatalog.length) return tecnicosCatalog;
      const res = await fetch('/api/gestionambiental/tecnicos-ambientales');
      if (res.ok){ tecnicosCatalog = await res.json(); }
    }catch(_){ /* ignore */ }
    return tecnicosCatalog;
  }

  function formatearFecha(fecha){
    if(!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-MX',{year:'numeric',month:'short',day:'numeric'});
  }

  function render(items){
    if (!tbody) return;
    if (!items.length) {
      tbody.innerHTML = '<tr data-empty="1"><td colspan="7" class="text-center text-muted">Sin trámites por notificar</td></tr>';
      return;
    }
    tbody.innerHTML = items.map(t => rowHtml(t)).join('');
  }

  function rowHtml(t){
    return `
      <tr id="row-${t._id}">
        <td class="text-center"><strong>${t.folioOficialia}</strong></td>
        <td><div><strong>${t.empresa?.codigo || '-'}</strong><br><small class="text-muted">${t.empresa?.razonSocial || '-'}</small></div></td>
        <td class="text-center">${formatearFecha(t.fechaEntrada)}</td>
        <td class="text-center">${t.tipoTramite || '-'}</td>
        <td class="text-center">${t.asuntoEspecifico || '-'}</td>
        <td class="text-center"><span class="status-badge status-resguardo">${t.status}</span></td>
        <td class="text-center">
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-info btn-sm" title="Ver" onclick="noti.ver('${t._id}')"><i class="fas fa-eye"></i></button>
            <button class="btn btn-outline-success btn-sm" title="Marcar como notificado" onclick="noti.marcar('${t._id}')"><i class="fas fa-check"></i></button>
          </div>
        </td>
      </tr>`;
  }

  function addOrUpdateRow(t){
    if (!tbody) return;
    if (t.status !== 'Resguardo para notificar') {
      // si ya no califica, eliminar fila si existe
      removeRow(t._id);
      return;
    }
    const placeholder = tbody.querySelector('tr[data-empty]');
    if (placeholder) placeholder.remove();
    const existing = document.getElementById(`row-${t._id}`);
    if (existing) {
      existing.outerHTML = rowHtml(t);
    } else {
      tbody.insertAdjacentHTML('afterbegin', rowHtml(t));
    }
  }

  function removeRow(id){
    if (!tbody) return;
    const el = document.getElementById(`row-${id}`);
    if (el) el.remove();
    // si quedó vacío, poner placeholder
    if (!tbody.querySelector('tr')) {
      tbody.innerHTML = '<tr data-empty="1"><td colspan="7" class="text-center text-muted">Sin trámites por notificar</td></tr>';
    }
  }

  function renderPaginacion(){
    if (!ulPaginacion) return;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const makeItem = (p, label = p, disabled = false, active = false) => {
      return `<li class="page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${p}">${label}</a>
      </li>`;
    };
    let html = '';
    html += makeItem(Math.max(1, page - 1), '&laquo;', page <= 1, false);
    const windowSize = 5;
    let start = Math.max(1, page - Math.floor(windowSize / 2));
    let end = Math.min(totalPages, start + windowSize - 1);
    if (end - start + 1 < windowSize) start = Math.max(1, end - windowSize + 1);
    for (let p = start; p <= end; p++) html += makeItem(p, String(p), false, p === page);
    html += makeItem(Math.min(totalPages, page + 1), '&raquo;', page >= totalPages, false);
    ulPaginacion.innerHTML = html;
    ulPaginacion.querySelectorAll('a.page-link').forEach(a => {
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        const p = Number(a.getAttribute('data-page'));
        if (!Number.isNaN(p) && p !== page){ page = p; cargar(); }
      });
    });
  }

  function renderResumen(){
    if (!resumen) return;
    const inicio = total === 0 ? 0 : (page - 1) * limit + 1;
    const fin = Math.min(total, page * limit);
    resumen.textContent = `Mostrando ${inicio}-${fin} de ${total}`;
  }

  async function ver(id){
    try{
      // asegurar tener catálogo de técnicos para resolver nombres
      await cargarCatalogoTecnicos();
      const res = await fetch(`/api/gestionambiental/tramites/${id}`);
      if(!res.ok) throw new Error('No se pudo obtener el trámite');
      const t = await res.json();
      const e = t.empresa || {};
      const dir = e.direccion || {};
      const notif = e.notificaciones || {};
      const rep = e.representanteLegal || {};
      const tipo = e.tipo || {};
      const tecnicos = Array.isArray(t.tecnicos) ? t.tecnicos.map(x => {
        // Si viene como objeto con nombre, usarlo
        if (x && typeof x === 'object' && x.nombre) return x.nombre;
        // Si parece ObjectId, buscar en catálogo
        const id = String(x);
        const found = tecnicosCatalog.find(tc => String(tc._id) === id);
        if (found) return found.nombre;
        // Fallback: mostrar valor crudo
        return id;
      }).join(', ') : '-';
      const html = `
        <div class="text-start">
          <div class="mb-3">
            <h5 class="mb-2">Información del Trámite</h5>
            <div class="row g-2">
              <div class="col-md-6"><strong>Folio:</strong> ${t.folioOficialia || '-'}</div>
              <div class="col-md-6"><strong>Fecha de entrada:</strong> ${formatearFecha(t.fechaEntrada)}</div>
              <div class="col-md-6"><strong>Tipo de trámite:</strong> ${t.tipoTramite || '-'}</div>
              <div class="col-md-6"><strong>Asunto específico:</strong> ${t.asuntoEspecifico || '-'}</div>
              <div class="col-md-6"><strong>Status:</strong> ${t.status || '-'}</div>
              <div class="col-md-6"><strong>Número de páginas:</strong> ${t.numeroPaginas ?? '-'}</div>
              <div class="col-md-6"><strong>Tiempo estimado salida:</strong> ${formatearFecha(t.tiempoEstimadoSalida)}</div>
              <div class="col-md-6"><strong>Técnicos asignados:</strong> ${escapeHtml(tecnicos || '-')}</div>
              <div class="col-md-6"><strong>Mes capturado:</strong> ${t.mesCapturado || '-'}</div>
              <div class="col-md-6"><strong>Año capturado:</strong> ${t.anioCapturado ?? '-'}</div>
              <div class="col-12"><strong>Observaciones del trámite:</strong><br>${t.observaciones ? escapeHtml(t.observaciones) : '<em class="text-muted">Sin observaciones</em>'}</div>
              <div class="col-12"><strong>Observaciones de notificación:</strong><br>${t.observacionesNotificacion ? escapeHtml(t.observacionesNotificacion) : '<em class="text-muted">(Se asignan al marcar como Notificado)</em>'}</div>
            </div>
          </div>
          <hr/>
          <div class="mb-3">
            <h5 class="mb-2">Información de la Empresa</h5>
            <div class="row g-2">
              <div class="col-md-6"><strong>Código:</strong> ${e.codigo || '-'}</div>
              <div class="col-md-6"><strong>Razón social:</strong> ${e.razonSocial || '-'}</div>
              <div class="col-md-6"><strong>Sucursal:</strong> ${e.sucursal || '-'}</div>
              <div class="col-md-6"><strong>RFC:</strong> ${e.rfc || '-'}</div>
              <div class="col-md-6"><strong>Teléfono:</strong> ${e.telefono || '-'}</div>
              <div class="col-md-6"><strong>Correo:</strong> ${e.correo || '-'}</div>
              <div class="col-md-6"><strong>Tipo de empresa:</strong> ${tipo?.nombre || '-'}</div>
              <div class="col-md-6"><strong>Estatus:</strong> ${typeof e.status === 'number' ? (e.status === 1 ? 'Activo' : 'Inactivo') : '-'}</div>
              <div class="col-md-6"><strong>Área:</strong> ${e.area ?? '-'}</div>
              <div class="col-12"><strong>Dirección fiscal:</strong><br/>
                ${[dir.calle, dir.noExterior, dir.noInterior].filter(Boolean).join(' ')}<br/>
                ${[dir.colonia, dir.cp].filter(Boolean).join(', ')}<br/>
                ${[dir.localidad, dir.municipio, dir.estado].filter(Boolean).join(', ')}
              </div>
            </div>
          </div>
          <div class="mb-3">
            <h6 class="mb-2">Datos para notificaciones</h6>
            <div class="row g-2">
              <div class="col-12"><strong>Domicilio:</strong><br/>
                ${[notif.calle, notif.noExterior, notif.noInterior].filter(Boolean).join(' ')}<br/>
                ${[notif.colonia, notif.cp].filter(Boolean).join(', ')}<br/>
                ${[notif.localidad, notif.municipio].filter(Boolean).join(', ')}
              </div>
              <div class="col-md-6"><strong>Teléfono:</strong> ${notif.telefono || '-'}</div>
              <div class="col-md-6"><strong>Correo:</strong> ${notif.correo || '-'}</div>
            </div>
          </div>
          <div class="mb-2">
            <h6 class="mb-2">Representante Legal</h6>
            <div class="row g-2">
              <div class="col-md-4"><strong>Nombre:</strong> ${rep.nombre || '-'}</div>
              <div class="col-md-4"><strong>Correo:</strong> ${rep.correo || '-'}</div>
              <div class="col-md-4"><strong>Teléfono:</strong> ${rep.telefono || '-'}</div>
            </div>
          </div>
          
        </div>`;
      if(window.Swal){ await Swal.fire({ title:'Detalle del Trámite', html, width: 800, confirmButtonText: 'Cerrar' }); }
      else alert(`Folio: ${t.folioOficialia}`);
    }catch(e){ if(window.Swal){ Swal.fire('Error', e.message, 'error'); } else alert(e.message); }
  }

  async function marcar(id){
    try {
      if (!window.Swal) { return alert('SweetAlert requerido'); }

      // Obtener el trámite para saber tipo (para vigencia)
      const detalleRes = await fetch(`/api/gestionambiental/tramites/${id}`);
      if (!detalleRes.ok) throw new Error('No se pudo obtener el trámite');
      const tramite = await detalleRes.json();
      const requiereVigencia = ['GRME','PM'].includes(tramite.tipoTramite);

      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      const mesActual = meses[new Date().getMonth()];
      const anioActual = new Date().getFullYear();

      const htmlForm = `
        <form id="formNotificar" class="text-start">
          <div class="mb-2">
            <label class="form-label">Observaciones</label>
            <textarea class="form-control" name="observaciones" rows="2" placeholder="Notas (opcional)"></textarea>
          </div>
          <div class="row g-2">
            <div class="col-md-6">
              <label class="form-label">Fecha de Notificación</label>
              <input type="date" name="fechaNotificacion" class="form-control" value="${new Date().toISOString().substring(0,10)}" required />
            </div>
            <div class="col-md-3">
              <label class="form-label">Mes</label>
              <select name="mesNotificacion" class="form-select" required>
                ${meses.map(m => `<option value="${m}" ${m===mesActual ? 'selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">Año</label>
              <input type="number" name="anioNotificacion" class="form-control" value="${anioActual}" required />
            </div>
            <div class="col-md-4">
              <label class="form-label">Hojas</label>
              <input type="number" name="hojasNotificacion" class="form-control" min="1" placeholder="Nº" />
            </div>
            <div class="col-md-4">
              <label class="form-label">¿Lleva Holograma?</label>
              <select name="hologramaAplica" class="form-select" id="selHolograma">
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </div>
            <div class="col-md-4 d-none" id="grpNumeroHolograma">
              <label class="form-label">Número de Holograma</label>
              <input type="text" name="numeroHolograma" class="form-control" placeholder="Ej. HG-123" />
            </div>
          </div>
          ${ requiereVigencia ? `
          <hr class="my-3"/>
          <div class="row g-2">
            <div class="col-12"><label class="form-label fw-semibold">Vigencia (sólo para ${tramite.tipoTramite})</label></div>
            <div class="col-md-6">
              <label class="form-label">Inicio</label>
              <input type="date" name="vigenciaInicio" class="form-control" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Fin</label>
              <input type="date" name="vigenciaFin" class="form-control" />
            </div>
          </div>` : '' }
        </form>`;

      const { dismiss, isConfirmed } = await Swal.fire({
        title: 'Marcar como Notificado',
        html: htmlForm,
        width: 700,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        didOpen: () => {
          const sel = document.getElementById('selHolograma');
          const grp = document.getElementById('grpNumeroHolograma');
          sel.addEventListener('change', () => {
            if (sel.value === 'si') grp.classList.remove('d-none'); else grp.classList.add('d-none');
          });
        },
        preConfirm: () => {
          const form = document.getElementById('formNotificar');
          if (!form) return;
          const fd = new FormData(form);
          const data = Object.fromEntries(fd.entries());
          // Normalizar
          data.hologramaAplica = data.hologramaAplica === 'si';
          if (!data.hologramaAplica) data.numeroHolograma = null;
          if (data.hojasNotificacion) data.hojasNotificacion = Number(data.hojasNotificacion);
          // Validaciones
            if (!data.fechaNotificacion) {
              Swal.showValidationMessage('Debe seleccionar la fecha de notificación');
              return false;
            }
            if (data.hologramaAplica && !data.numeroHolograma) {
              Swal.showValidationMessage('Debe capturar el número de holograma o seleccionar No');
              return false;
            }
            if (requiereVigencia && (data.vigenciaInicio || data.vigenciaFin) && !(data.vigenciaInicio && data.vigenciaFin)) {
              Swal.showValidationMessage('Debe proporcionar inicio y fin de vigencia');
              return false;
            }
          return data;
        }
      });
      if (dismiss || !isConfirmed) return;
      const formData = Swal.getPopup().querySelector('form') ? Swal.getPopup().querySelector('form') : null;
      let payload = Swal.getInput ? {} : {};
      // Recuperar datos procesados de preConfirm almacenados en "value" no es directo, reconstruimos
      const fd = new FormData(document.getElementById('formNotificar'));
      payload = Object.fromEntries(fd.entries());
      payload.hologramaAplica = payload.hologramaAplica === 'si';
      if (payload.hojasNotificacion) payload.hojasNotificacion = Number(payload.hojasNotificacion);
      if (!payload.hologramaAplica) payload.numeroHolograma = null;

      // Añadir campos fijos
      payload.status = 'Notificado';
      payload.observacionesNotificacion = payload.observaciones || '';
      payload.fechaNotificacion = payload.fechaNotificacion;
      payload.mesNotificacion = payload.mesNotificacion;
      payload.anioNotificacion = payload.anioNotificacion ? Number(payload.anioNotificacion) : undefined;
      if (!['GRME','PM'].includes(tramite.tipoTramite)) { delete payload.vigenciaInicio; delete payload.vigenciaFin; }

      const res = await fetch(`/api/gestionambiental/tramites/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({message:'Error al actualizar'}));
        throw new Error(err.message || 'Error al actualizar');
      }
      await Swal.fire({ icon:'success', title:'Notificado', text:'Trámite actualizado correctamente', timer:1600, showConfirmButton:false });
      cargar();
    } catch(e){
      if (window.Swal) Swal.fire('Error', e.message, 'error'); else alert(e.message);
    }
  }

  function escapeHtml(str=''){ return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

  window.noti = { ver, marcar };
  if (btnBuscar) btnBuscar.addEventListener('click', () => { search = txtBuscar.value || ''; page = 1; cargar(); });
  if (txtBuscar) {
    // Buscar al presionar Enter (opcional) y también conforme escribe (debounce)
    txtBuscar.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') { search = txtBuscar.value || ''; page = 1; cargar(); return; }
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { search = txtBuscar.value || ''; page = 1; cargar(); }, 350);
    });
    txtBuscar.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { search = txtBuscar.value || ''; page = 1; cargar(); }, 350);
    });
  }

  // Socket live updates: actualizar incrementalmente
  if (window.io){
    try{
      const socket = io();
      socket.on('tramite:create', ({ tramite }) => {
        if (tramite) {
          // Si cae en la página actual filtrada por status y search, intentamos agregar
          if (tramite.status === 'Resguardo para notificar') {
            if (!search || coincideBusqueda(tramite, search)) addOrUpdateRow(tramite);
          } else {
            removeRow(tramite._id);
          }
        }
      });
      socket.on('tramite:update', ({ tramite }) => {
        if (tramite) {
          if (tramite.status === 'Resguardo para notificar') {
            if (!search || coincideBusqueda(tramite, search)) addOrUpdateRow(tramite); else removeRow(tramite._id);
          } else {
            removeRow(tramite._id);
          }
        }
      });
      socket.on('tramite:delete', ({ id }) => {
        if (id) removeRow(id);
      });
    }catch(_){/* ignore */}
  }

  cargar();
})();

  function coincideBusqueda(t, q){
    const s = (q || '').toLowerCase();
    if (!s) return true;
    const campos = [t.folioOficialia, t.observaciones, t.tipoTramite, t.asuntoEspecifico, t.empresa?.codigo, t.empresa?.razonSocial];
    return campos.some(v => (v || '').toString().toLowerCase().includes(s));
  }
