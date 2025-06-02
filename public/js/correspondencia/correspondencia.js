// JS para el módulo de correspondencia
let editandoId = null;

const tabla = $('#tablaCorrespondencia').DataTable({
  ajax: {
    url: '/api/correspondencia',
    dataSrc: ''
  },
  columns: [
    {
      title: '#',
      data: null,
      orderable: false,
      searchable: false,
      render: (data, type, row, meta) => meta.row + 1
    },
    { data: 'folioOficial', title: 'Folio Oficial' },
    {
      data: 'fechaRegistro',
      title: 'Fecha',
      render: data => {
        const fecha = new Date(data);
        const opcionesFecha = { day: '2-digit', month: '2-digit', year: 'numeric' };
        const opcionesHora = { hour: '2-digit', minute: '2-digit', hour: '2-digit', hour12: false };
        const fechaStr = fecha.toLocaleDateString('es-MX', opcionesFecha);
        const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
        return `${fechaStr} ${horaStr}`;
      }
    },
    {
      data: 'fechaOficio',
      title: 'Fecha del Oficio',
      render: data => data ? new Date(data).toLocaleDateString('es-ES') : ''
    },
    { data: 'numeroOficio', title: 'No. de Oficio' },
    { data: 'remite', title: 'Remite' },
    { data: 'cargoDependencia', title: 'Cargo / Dependencia' },
    { data: 'asunto', title: 'Asunto' },
    { data: 'comentarios', title: 'Comentarios / Acuerdo Interno' },
    { data: 'tarjetaTurno', title: 'No. Tarjeta Turno' },
    {
      data: 'archivos',
      title: 'Acciones',
      render: function (archivos, type, row) {
        const links = Array.isArray(archivos) && archivos.length > 0
          ? archivos.map(nombre => `<a href="/archivos/${nombre}" target="_blank" class="btn btn-sm btn-primary me-1"><i class='fas fa-file-download'></i></a>`).join('')
          : '';

        return `${links}
          <button class="btn btn-warning btn-sm btn-editar" data-id="${row._id}"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-sm btn-eliminar" data-id="${row._id}"><i class="fas fa-trash-alt"></i></button>`;
      }
    }
  ],
  language: {
      "processing": "Procesando...",
      "lengthMenu": "Mostrar _MENU_ registros",
      "zeroRecords": "No se encontraron resultados",
      "emptyTable": "Ningún dato disponible en esta tabla",
      "info": "Mostrando registros del _START_ al _END_ de un total de _TOTAL_ registros",
      "infoEmpty": "Mostrando registros del 0 al 0 de un total de 0 registros",
      "infoFiltered": "(filtrado de un total de _MAX_ registros)",
      "search": "Buscar:",
      "paginate": {
          "first": "Primera",
          "previous": "Anterior",
          "next": "Siguiente",
          "last": "Última"
      },
      "aria": {
          "sortAscending": ": Activar para ordenar la columna de manera ascendente",
          "sortDescending": ": Activar para ordenar la columna de manera descendente"
      }
  }
});

tabla.on('order.dt search.dt draw.dt', function () {
  const total = tabla.rows({ search: 'applied' }).count();
  tabla.column(0, { search: 'applied', order: 'applied' }).nodes().each(function (cell, i) {
    cell.innerHTML = total - i;
  });
});





$('#btnNuevoOficio').on('click', function () {
  editandoId = null;
  $('#formCorrespondencia')[0].reset();
  $('#archivoActualContainer').hide();
  document.getElementById('listaArchivosActuales').innerHTML = '';
  document.getElementById('archivoActualContainer').dataset.archivosAEliminar = JSON.stringify([]);
  $('#modalCorrespondenciaLabel').text('Registrar nueva correspondencia');
  $('#modalCorrespondencia').modal('show');
});

$('#formCorrespondencia').on('submit', async function (e) {
  e.preventDefault();
  const formData = new FormData(this);
  const url = editandoId ? `/api/correspondencia/${editandoId}` : '/api/correspondencia';
  const method = editandoId ? 'PUT' : 'POST';

  const archivoContainer = document.getElementById('archivoActualContainer');
  const archivosEliminados = archivoContainer.dataset.archivosAEliminar;
  if (archivosEliminados) {
    formData.append('archivosAEliminar', archivosEliminados);
  }

  try {
    const res = await fetch(url, { method, body: formData });
    const data = await res.json();

    if (res.ok) {
      $('#modalCorrespondencia').modal('hide');
      tabla.ajax.reload(null, false);
      this.reset();
      editandoId = null;
      Swal.fire('✅ Éxito', data.message, 'success');
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    Swal.fire('❌ Error', err.message, 'error');
  }
});

$('#tablaCorrespondencia').on('click', '.btn-editar', async function () {
  const id = $(this).data('id');
  try {
    const res = await fetch(`/api/correspondencia/${id}`);
    const data = await res.json();

    editandoId = id;
    const form = document.getElementById('formCorrespondencia');

    form.folioOficial.value = data.folioOficial || '';
    form.fechaRegistro.value = data.fechaRegistro ? data.fechaRegistro.split('T')[0] : '';
    form.fechaOficio.value = data.fechaOficio ? data.fechaOficio.split('T')[0] : '';
    form.numeroOficio.value = data.numeroOficio || '';
    form.remite.value = data.remite || '';
    form.cargoDependencia.value = data.cargoDependencia || '';
    form.asunto.value = data.asunto || '';
    form.comentarios.value = data.comentarios || '';
    form.tarjetaTurno.value = data.tarjetaTurno || '';

    const contenedor = document.getElementById('archivoActualContainer');
    const lista = document.getElementById('listaArchivosActuales');
    lista.innerHTML = '';
    contenedor.style.display = 'none';
    contenedor.dataset.archivosAEliminar = JSON.stringify([]);

    if (data.archivos && data.archivos.length > 0) {
      contenedor.style.display = 'block';

      data.archivos.forEach(nombre => {
        const item = document.createElement('div');
        item.className = 'archivo-item bg-light border rounded px-2 py-1 d-flex align-items-center';
        item.dataset.nombre = nombre;

        item.innerHTML = `
          <span class="me-2 text-primary">${nombre}</span>
          <button type="button" class="btn btn-sm btn-outline-danger btn-eliminar-archivo">
            <i class="fas fa-times"></i>
          </button>
        `;

        lista.appendChild(item);
      });
    }

    $('#modalCorrespondenciaLabel').text('Editar correspondencia');
    $('#modalCorrespondencia').modal('show');
  } catch (err) {
    Swal.fire('❌ Error', 'No se pudo cargar la correspondencia.', 'error');
  }
});

document.getElementById('listaArchivosActuales').addEventListener('click', function (e) {
  if (e.target.closest('.btn-eliminar-archivo')) {
    const item = e.target.closest('.archivo-item');
    const nombre = item.dataset.nombre;
    const contenedor = document.getElementById('archivoActualContainer');
    const aEliminar = JSON.parse(contenedor.dataset.archivosAEliminar || '[]');
    aEliminar.push(nombre);
    contenedor.dataset.archivosAEliminar = JSON.stringify(aEliminar);
    item.remove();
  }
});

$('#tablaCorrespondencia').on('click', '.btn-eliminar', function () {
  const id = $(this).data('id');
  Swal.fire({
    title: '¿Eliminar correspondencia?',
    text: 'Esta acción no se puede deshacer.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/correspondencia/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
          tabla.ajax.reload(null, false);
          Swal.fire('✅ Eliminado', 'La correspondencia fue eliminada.', 'success');
        } else {
          throw new Error(data.message);
        }
      } catch (err) {
        Swal.fire('❌ Error', err.message, 'error');
      }
    }
  });
});
