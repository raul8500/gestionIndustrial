// Inicializar DataTable
const tabla = $('#tablaRegistros').DataTable({
  ajax: {
      url: '/api/getOficios',
      dataSrc: 'oficios'
  },
  columns: [
      { data: 'noOficio', title: 'No. de Oficio' },
      {
          data: 'fecha',
          title: 'Fecha',
          render: data => new Date(data).toLocaleDateString('es-ES')
      },
      { 
          data: 'tipoCorrespondencia', 
          title: 'Tipo de Correspondencia',
          render: function(data, type, row) {
              if (data === 1) {
                  return '<span class="badge badge-primary">Interna</span>';
              } else if (data === 2) {
                  return '<span class="badge badge-success">Externa</span>';
              } else {
                  return '<span class="badge badge-secondary">Sin definir</span>';
              }
          }
      },        
      { data: 'institucion', title: 'Institución' },
      { data: 'asunto', title: 'Asunto' },
      { data: 'tipoRespuesta', title: 'Tipo de Respuesta' },
      {
        data: 'departamentoTurnado',
        title: 'Departamento Turnado',
        render: function (data) {
          if (Array.isArray(data)) {
            return data.map(dep => `<span class="badge badge-secondary mr-1">${dep}</span>`).join(' ');
          } else {
            return `<span class="badge badge-secondary">${data || 'N/A'}</span>`;
          }
        }
      },
      { 
        data: 'status', 
        title: 'Status',
        render: function(data, type, row) {
          if (data === 1 || data === '1') {
            return '<span class="badge badge-danger">Pendiente</span>'; // Rojo
          } else if (data === 2 || data === '2') {
            return '<span class="badge badge-warning">En proceso</span>'; // Naranja
          } else if (data === 3 || data === '3') {
            return '<span class="badge badge-success">Finalizado</span>'; // Verde
          } else {
            return '<span class="badge badge-secondary">Sin definir</span>'; // Opcional, por si viene otro valor
          }
        }
      },
      {
          data: 'archivos',
          title: 'Acciones',
          render: function (archivos, type, row) {
              // Verifica si 'archivos' es un arreglo y tiene elementos o si no está vacío
              if (Array.isArray(archivos) && archivos.length > 0) {
                  return archivos.map(nombre => `
                      <a href="/archivos/${nombre}" target="_blank" class="btn btn-sm btn-primary me-1">
                          <i class="fas fa-file-download"></i>
                      </a>
                  `).join('') +
                  `<button class="btn btn-warning btn-sm btn-editar" data-id="${row._id}"><i class="fas fa-edit"></i></button>
                   <button class="btn btn-danger btn-sm btn-eliminar" data-id="${row._id}"><i class="fas fa-trash-alt"></i></button>`;
              } else {
                  // Si no hay archivos, muestra los botones de editar y eliminar
                  return `
                      <button class="btn btn-warning btn-sm btn-editar" data-id="${row._id}"><i class="fas fa-edit"></i></button>
                      <button class="btn btn-danger btn-sm btn-eliminar" data-id="${row._id}"><i class="fas fa-trash-alt"></i></button>
                  `;
              }
          }
      }
  ],
  order: [[1, 'desc']],
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


let editandoId = null;

// Nuevo oficio
$('#btnNuevoOficio').on('click', function () {
  editandoId = null;
  $('#formOficio')[0].reset();
  $('#modalOficioLabel').text('Registrar nuevo oficio');
  $('#archivoActualContainer').hide().removeAttr('data-eliminado'); // Ocultar contenedor al crear nuevo
  $('#modalOficio').modal('show');
});

// Guardar oficio (crear o editar)
$('#formOficio').on('submit', async function (e) {
  e.preventDefault();
  // Agregar departamentos seleccionados
  const formData = new FormData(this);

  const departamentos = Array.from(document.querySelectorAll('input[name="departamentoTurnado"]:checked')).map(cb => cb.value);
  formData.delete('departamentoTurnado'); // Elimina posibles valores individuales anteriores
  formData.append('departamentoTurnado', JSON.stringify(departamentos));


  const url = editandoId ? `/api/updateOficio/${editandoId}` : '/api/createOficio';
  const method = editandoId ? 'PUT' : 'POST';

  // Enviar lista de archivos eliminados
  const archivoContainer = document.getElementById('archivoActualContainer');
  const archivosEliminados = archivoContainer.dataset.archivosAEliminar; // Obtiene la lista de archivos eliminados
  if (archivosEliminados) {
    formData.append('archivosAEliminar', archivosEliminados); // Envia los archivos eliminados
  }  

  try {
    const res = await fetch(url, {
      method,
      body: formData
    });
    const data = await res.json();

    if (res.ok) {
      $('#modalOficio').modal('hide');
      $('#tablaRegistros').DataTable().ajax.reload(null, false);
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

// Editar oficio
$('#tablaRegistros').on('click', '.btn-editar', async function () {
  const id = $(this).data('id');
  try {
    const res = await fetch(`/api/getOficio/${id}`);
    const { oficio } = await res.json();

    editandoId = id;
    const form = document.getElementById('formOficio');

    form.noOficio.value = oficio.noOficio || '';
    form.fecha.value = oficio.fecha ? oficio.fecha.split('T')[0] : '';
    form.tipoCorrespondencia.value = oficio.tipoCorrespondencia || '';
    form.institucion.value = oficio.institucion || '';
    form.asunto.value = oficio.asunto || '';
    form.tipoRespuesta.value = oficio.tipoRespuesta || '';
    form.observaciones.value = oficio.observaciones || '';
    // Limpiar checkboxes primero
    document.querySelectorAll('input[name="departamentoTurnado"]').forEach(cb => {
      cb.checked = false;
    });

    // Marcar los que correspondan
    if (Array.isArray(oficio.departamentoTurnado)) {
      oficio.departamentoTurnado.forEach(dep => {
        const checkbox = document.querySelector(`input[name="departamentoTurnado"][value="${dep}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }
    form.status.value = oficio.status || '';

    // Mostrar archivos actuales
    const contenedor = document.getElementById('archivoActualContainer');
    const lista = document.getElementById('listaArchivosActuales');
    lista.innerHTML = '';
    contenedor.style.display = 'none';
    contenedor.dataset.archivosAEliminar = JSON.stringify([]); // reset

    if (oficio.archivos && oficio.archivos.length > 0) {
      contenedor.style.display = 'block';

      oficio.archivos.forEach(nombre => {
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

    $('#modalOficioLabel').text('Editar oficio');
    $('#modalOficio').modal('show');
  } catch (err) {
    Swal.fire('❌ Error', 'No se pudo cargar el oficio.', 'error');
  }
});

// Evento delegado para eliminar archivos visualmente
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

// Eliminar oficio
$('#tablaRegistros').on('click', '.btn-eliminar', function () {
  const id = $(this).data('id');
  Swal.fire({
    title: '¿Eliminar oficio?',
    text: 'Esta acción no se puede deshacer.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/deleteOficio/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
          $('#tablaRegistros').DataTable().ajax.reload(null, false);
          Swal.fire('✅ Eliminado', 'El oficio fue eliminado.', 'success');
        } else {
          throw new Error(data.message);
        }
      } catch (err) {
        Swal.fire('❌ Error', err.message, 'error');
      }
    }
  });
});
