let editandoId = null;

const tabla = $('#tablaInventarioTICs').DataTable({
  ajax: {
    url: '/api/inventario/',
    dataSrc: ''
  },
  columns: [
    { data: 'numero' },
    { data: 'ip' },
    { data: 'equipo' },
    { data: 'area' },
    { data: 'marca' },
    { data: 'procesador' },
    { data: 'ram' },
    { data: 'discoDuro' },
    { data: 'numeroInventario' },
    {
      data: '_id',
      render: (id) => `
        <button class="btn btn-warning btn-sm btn-editar" data-id="${id}"><i class="fas fa-edit"></i></button>
        <button class="btn btn-danger btn-sm btn-eliminar" data-id="${id}"><i class="fas fa-trash-alt"></i></button>
      `
    }
  ],
  order: [[0, 'asc']],
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

$('#btnNuevoEquipo').on('click', () => {
  editandoId = null;
  $('#modalEquipoLabel').text('Registrar nuevo equipo');
  $('#formEquipo')[0].reset();
  $('#modalEquipo').modal('show');
});

$('#formEquipo').on('submit', async function (e) {
  e.preventDefault();
  const datos = {
    numero: $('#numero').val(),
    ip: $('#ip').val(),
    equipo: $('#equipo').val(),
    area: $('#area').val(),
    marca: $('#marca').val(),
    procesador: $('#procesador').val(),
    ram: $('#ram').val(),
    discoDuro: $('#discoDuro').val(),
    numeroInventario: $('#numeroInventario').val()
  };

  const url = editandoId ? `/api/inventario/${editandoId}` : '/api/inventario/';
  const method = editandoId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });

    if (res.ok) {
      $('#modalEquipo').modal('hide');
      tabla.ajax.reload(null, false);
      Swal.fire('✅ Éxito', 'Guardado correctamente', 'success');
    } else {
      const { message } = await res.json();
      throw new Error(message || 'Error al guardar');
    }
  } catch (err) {
    Swal.fire('❌ Error', err.message, 'error');
  }
});

$('#tablaInventarioTICs').on('click', '.btn-editar', async function () {
  const id = $(this).data('id');
  try {
    const res = await fetch(`/api/inventario/${id}`);
    const data = await res.json();

    editandoId = id;
    $('#modalEquipoLabel').text('Editar equipo');
    $('#equipoId').val(id);

    $('#numero').val(data.numero);
    $('#ip').val(data.ip);
    $('#equipo').val(data.equipo);
    $('#area').val(data.area);
    $('#marca').val(data.marca);
    $('#procesador').val(data.procesador);
    $('#ram').val(data.ram);
    $('#discoDuro').val(data.discoDuro);
    $('#numeroInventario').val(data.numeroInventario);

    $('#modalEquipo').modal('show');
  } catch (err) {
    Swal.fire('❌ Error', 'No se pudo cargar el equipo', 'error');
  }
});

$('#tablaInventarioTICs').on('click', '.btn-eliminar', async function () {
  const id = $(this).data('id');

  const confirmacion = await Swal.fire({
    title: '¿Eliminar equipo?',
    text: 'Esta acción no se puede deshacer.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  });

  if (confirmacion.isConfirmed) {
    try {
      const res = await fetch(`/api/inventario/${id}`, { method: 'DELETE' });
      if (res.ok) {
        tabla.ajax.reload(null, false);
        Swal.fire('✅ Eliminado', 'El equipo fue eliminado.', 'success');
      } else {
        throw new Error('Error al eliminar');
      }
    } catch (err) {
      Swal.fire('❌ Error', err.message, 'error');
    }
  }
});
