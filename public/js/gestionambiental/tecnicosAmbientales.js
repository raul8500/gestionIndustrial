// Técnicos Ambientales - CRUD (vanilla)
let editTecnicoId = null;

document.addEventListener('DOMContentLoaded', () => {
  cargarTecnicos();
  bindUI();
});

async function cargarTecnicos() {
  try {
    const res = await fetch('/api/gestionambiental/tecnicos-ambientales');
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Error al cargar técnicos');
    renderTabla(data);
  } catch (e) {
    console.error(e);
    Swal.fire('Error', e.message || 'No se pudieron cargar los técnicos', 'error');
  }
}

function renderTabla(tecnicos) {
  const tbody = document.querySelector('#tablaTecnicos tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  tecnicos.forEach((t, idx) => {
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
  const btnNuevo = document.getElementById('btnNuevoTecnico');
  const form = document.getElementById('formTecnico');
  const tabla = document.getElementById('tablaTecnicos');
  const modalEl = document.getElementById('modalTecnico');
  const modal = modalEl ? new bootstrap.Modal(modalEl) : null;

  if (btnNuevo) {
    btnNuevo.addEventListener('click', () => {
      editTecnicoId = null;
      document.getElementById('tecnicoId').value = '';
      document.getElementById('tecnicoNombre').value = '';
      document.getElementById('tecnicoStatus').value = '1';
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
        await eliminarTecnico(id);
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
  const res = await fetch(`/api/gestionambiental/tecnicos-ambientales/${id}`);
  const tec = await res.json();
  if (!res.ok) {
    Swal.fire('Error', tec.message || 'No se pudo obtener el técnico', 'error');
    return;
  }
  editTecnicoId = id;
  document.getElementById('tecnicoId').value = id;
  document.getElementById('tecnicoNombre').value = tec.nombre || '';
  document.getElementById('tecnicoStatus').value = String(tec.status ?? 1);
  if (modal) modal.show();
}

async function eliminarTecnico(id) {
  const conf = await Swal.fire({ title: '¿Eliminar?', text: 'Se eliminará el técnico seleccionado', icon: 'warning', showCancelButton: true });
  if (!conf.isConfirmed) return;
  const res = await fetch(`/api/gestionambiental/tecnicos-ambientales/${id}`, { method: 'DELETE' });
  if (res.ok) {
    await cargarTecnicos();
    Swal.fire('Eliminado', 'El técnico fue eliminado', 'success');
  } else {
    const { message } = await res.json();
    Swal.fire('Error', message || 'No se pudo eliminar', 'error');
  }
}

async function guardar(form, modal) {
  const nombre = document.getElementById('tecnicoNombre').value.trim();
  const status = parseInt(document.getElementById('tecnicoStatus').value);
  if (!nombre) {
    Swal.fire('Validación', 'El nombre es obligatorio', 'warning');
    return;
  }
  const payload = { nombre, status };
  const url = editTecnicoId ? `/api/gestionambiental/tecnicos-ambientales/${editTecnicoId}` : '/api/gestionambiental/tecnicos-ambientales';
  const method = editTecnicoId ? 'PUT' : 'POST';
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (res.ok) {
    if (modal) modal.hide();
    await cargarTecnicos();
    editTecnicoId = null;
    form.reset();
    Swal.fire('Guardado', 'El técnico fue guardado correctamente', 'success');
  } else {
    const { message } = await res.json();
    Swal.fire('Error', message || 'No se pudo guardar', 'error');
  }
}
