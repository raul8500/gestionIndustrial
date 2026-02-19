// Catálogo Tipos de Empresa - vanilla JS (sin jQuery)
let editTipoId = null;

document.addEventListener('DOMContentLoaded', () => {
  cargarTipos();
  bindUI();
});

async function cargarTipos() {
  try {
    const res = await fetch('/api/gestionambiental/tipos-empresa');
    const tipos = await res.json();
    if (!res.ok) throw new Error(tipos.message || 'Error al cargar tipos');
    renderTabla(tipos);
  } catch (e) {
    console.error(e);
    Swal.fire('Error', e.message || 'No se pudieron cargar los tipos', 'error');
  }
}

function renderTabla(tipos) {
  const tbody = document.querySelector('#tablaTipos tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  tipos.forEach((t, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text-center">${idx + 1}</td>
      <td><div class="text-truncate" title="${t.nombre}">${t.nombre}</div></td>
      <td class="text-center"><span class="badge ${t.status === 1 ? 'bg-success' : 'bg-secondary'}">${t.status === 1 ? 'Activo' : 'Inactivo'}</span></td>
      <td class="text-center">
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-warning btn-sm" data-action="editar" data-id="${t._id}"><i class="fas fa-edit"></i></button>
          <button class="btn btn-outline-danger btn-sm" data-action="eliminar" data-id="${t._id}"><i class="fas fa-trash"></i></button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

function bindUI() {
  const btnNuevo = document.getElementById('btnNuevoTipo');
  const form = document.getElementById('formTipo');
  const tabla = document.getElementById('tablaTipos');
  const modalEl = document.getElementById('modalTipo');
  const modal = modalEl ? new bootstrap.Modal(modalEl) : null;

  if (btnNuevo) {
    btnNuevo.addEventListener('click', () => {
      editTipoId = null;
      document.getElementById('tipoId').value = '';
      document.getElementById('tipoNombre').value = '';
      document.getElementById('tipoStatus').value = '1';
      if (modal) modal.show();
    });
  }

  if (tabla) {
    tabla.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      if (action === 'editar') {
        await abrirEditar(id, modal);
      } else if (action === 'eliminar') {
        await eliminarTipo(id);
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await guardar(form, modal);
    });
  }
}

async function abrirEditar(id, modal) {
  const res = await fetch('/api/gestionambiental/tipos-empresa');
  const tipos = await res.json();
  const tipo = Array.isArray(tipos) ? tipos.find(x => x._id === id) : null;
  if (!tipo) return;
  editTipoId = id;
  document.getElementById('tipoId').value = id;
  document.getElementById('tipoNombre').value = tipo.nombre || '';
  document.getElementById('tipoStatus').value = String(tipo.status ?? 1);
  if (modal) modal.show();
}

async function eliminarTipo(id) {
  const conf = await Swal.fire({ title: '¿Eliminar?', text: 'Se eliminará el tipo seleccionado', icon: 'warning', showCancelButton: true });
  if (!conf.isConfirmed) return;
  const res = await fetch(`/api/gestionambiental/tipos-empresa/${id}`, { method: 'DELETE' });
  if (res.ok) {
    await cargarTipos();
    Swal.fire('Eliminado', 'El tipo fue eliminado', 'success');
  } else {
    const { message } = await res.json();
    Swal.fire('Error', message || 'No se pudo eliminar', 'error');
  }
}

async function guardar(form, modal) {
  const nombre = document.getElementById('tipoNombre').value.trim();
  const status = parseInt(document.getElementById('tipoStatus').value);
  if (!nombre) {
    Swal.fire('Validación', 'El nombre es obligatorio', 'warning');
    return;
  }
  const payload = { nombre, status };
  const url = editTipoId ? `/api/gestionambiental/tipos-empresa/${editTipoId}` : '/api/gestionambiental/tipos-empresa';
  const method = editTipoId ? 'PUT' : 'POST';
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (res.ok) {
    if (modal) modal.hide();
    await cargarTipos();
    editTipoId = null;
    form.reset();
    Swal.fire('Guardado', 'El tipo fue guardado correctamente', 'success');
  } else {
    const { message } = await res.json();
    Swal.fire('Error', message || 'No se pudo guardar', 'error');
  }
}
