// Inicializar DataTable
const tabla = $('#tablaRegistros').DataTable({
    ajax: {
      url: '/api/tickets',
      dataSrc: ''
    },
    columns: [
      { data: null, title: '#' , render: (data, type, row, meta) => meta.row + 1 },
      { data: 'titulo', title: 'Título' },
      { data: 'solicitante', title: 'Solicitante' },
      { 
        data: 'estado',
        title: 'Estado',
        render: function(data) {
          if (data == 0) return '<span class="badge bg-secondary">Abierto</span>';
          if (data == 1) return '<span class="badge bg-warning">En proceso</span>';
          if (data == 2) return '<span class="badge bg-success">Cerrado</span>';
          return '<span class="badge bg-light">Desconocido</span>';
        }
      },
      { 
        data: 'prioridad',
        title: 'Prioridad',
        render: function(data) {
          if (data == 0) return '<span class="badge bg-info">Baja</span>';
          if (data == 1) return '<span class="badge bg-primary">Media</span>';
          if (data == 2) return '<span class="badge bg-danger">Alta</span>';
          return '<span class="badge bg-light">Desconocida</span>';
        }
      },
      { 
        data: 'fechaCreacion',
        title: 'Fecha de Creación',
        render: function(data) {
          return new Date(data).toLocaleDateString('es-ES');
        }
      },
      { 
        data: 'fechaActualizacion',
        title: 'Fecha Actualización',
        render: function(data) {
          return data ? new Date(data).toLocaleDateString('es-ES') : '';
        }
      },
      {
        data: null,
        title: 'Acciones',
        render: function(data, type, row) {
          return `
            <button class="btn btn-warning btn-sm btn-editar" data-id="${row._id}"><i class="fas fa-edit"></i></button>
            <button class="btn btn-danger btn-sm btn-eliminar" data-id="${row._id}"><i class="fas fa-trash-alt"></i></button>
          `;
        }
      }
    ],
    order: [[6, 'desc']],
    language: {
      "processing": "Procesando...",
      "lengthMenu": "Mostrar _MENU_ registros",
      "zeroRecords": "No se encontraron resultados",
      "emptyTable": "Ningún dato disponible",
      "info": "Mostrando _START_ a _END_ de _TOTAL_ registros",
      "infoEmpty": "Mostrando 0 a 0 de 0 registros",
      "infoFiltered": "(filtrado de _MAX_ registros)",
      "search": "Buscar:",
      "paginate": {
        "first": "Primera",
        "previous": "Anterior",
        "next": "Siguiente",
        "last": "Última"
      }
    }
  });
  
  let editandoId = null;
  
  // Nuevo ticket
  $('#btnNuevoTicket').on('click', function () {
    editandoId = null;
    $('#formTicket')[0].reset();
    $('#formTicket').find('[name="_id"]').val(''); // 👈 limpiar manualmente el campo oculto
    $('#modalTicketLabel').text('Registrar nuevo ticket');
    $('#modalTicket').modal('show');
  });
  
  
  // Guardar ticket (crear o actualizar)
  $('#formTicket').on('submit', async function (e) {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(this).entries());
  
    formData.estado = parseInt(formData.estado);
    formData.prioridad = parseInt(formData.prioridad);
  
    // 👀 ELIMINAR _id si está vacío
    if (!formData._id) delete formData._id;
  
    const url = editandoId ? `/api/tickets/${editandoId}` : '/api/tickets';
    const method = editandoId ? 'PUT' : 'POST';
  
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
  
      if (res.ok) {
        $('#modalTicket').modal('hide');
        $('#tablaRegistros').DataTable().ajax.reload(null, false);
        this.reset();
        editandoId = null;
        Swal.fire('✅ Éxito', data.message || 'Operación exitosa', 'success');
      } else {
        throw new Error(data.error || data.message);
      }
    } catch (err) {
      Swal.fire('❌ Error', err.message, 'error');
    }
  });
  
  
  
  // Editar ticket
  $('#tablaRegistros').on('click', '.btn-editar', async function () {
    const id = $(this).data('id');
    try {
      const res = await fetch(`/api/tickets/${id}`);
      const ticket = await res.json();
  
      editandoId = id;
      const form = document.getElementById('formTicket');
  
      form._id.value = ticket._id || '';
      form.titulo.value = ticket.titulo || '';
      form.solicitante.value = ticket.solicitante || '';
      form.descripcion.value = ticket.descripcion || '';
      form.estado.value = ticket.estado != null ? ticket.estado : 0;
      form.prioridad.value = ticket.prioridad != null ? ticket.prioridad : 1;
      form.observaciones.value = ticket.observaciones || '';
  
      $('#modalTicketLabel').text('Editar ticket');
      $('#modalTicket').modal('show');
    } catch (err) {
      Swal.fire('❌ Error', 'No se pudo cargar el ticket.', 'error');
    }
  });
  
  // Eliminar ticket
  $('#tablaRegistros').on('click', '.btn-eliminar', function () {
    const id = $(this).data('id');
    Swal.fire({
      title: '¿Eliminar ticket?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (res.ok) {
            $('#tablaRegistros').DataTable().ajax.reload(null, false);
            Swal.fire('✅ Eliminado', 'El ticket fue eliminado.', 'success');
          } else {
            throw new Error(data.message);
          }
        } catch (err) {
          Swal.fire('❌ Error', err.message, 'error');
        }
      }
    });
  });


  // Evento submit del reporte
$('#formReporte').on('submit', async function (e) {
    e.preventDefault();
  
    const formData = Object.fromEntries(new FormData(this).entries());
    const url = `/api/tickets/reporte/${formData.fechaInicio}/${formData.fechaFin}`;
  
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error('Error al generar el reporte');
  
      const blob = await res.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = `Reporte_Tickets_${formData.fechaInicio}_a_${formData.fechaFin}.pdf`;
      link.click();
  
      $('#modalReporte').modal('hide');
      Swal.fire('✅ Éxito', 'Reporte generado y descargado.', 'success');
    } catch (err) {
      Swal.fire('❌ Error', err.message, 'error');
    }
  });
  