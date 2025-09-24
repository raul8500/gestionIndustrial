// JavaScript completo para control de usuarios de Gestión Ambiental
let editandoId = null;

// Tabla
const tabla = $('#tablaUsuarios').DataTable({
  ajax: { url: '/api/gestionambiental/usuarios/', dataSrc: '' },
  columns: [
    { data: null, render: (data, type, row, meta) => meta.row + 1 },
    { data: 'name' },
    { data: 'username' },
    {
      data: 'status',
      render: status => {
        const clase = status === 1 ? 'badge badge-success' : 'badge badge-secondary';
        const texto = status === 1 ? 'Activo' : 'Inactivo';
        return `<span class="${clase}">${texto}</span>`;
      }
    },
    {
      data: '_id',
      render: id => `
        <button class="btn btn-warning btn-sm btn-editar" data-id="${id}"><i class="fas fa-edit"></i></button>
        <button class="btn btn-info btn-sm btn-password" data-id="${id}"><i class="fas fa-key"></i></button>
        <button class="btn btn-danger btn-sm btn-eliminar" data-id="${id}"><i class="fas fa-trash-alt"></i></button>
      `
    }
  ],
  order: [[0, 'asc']],
  language: {
    processing: "Procesando...",
    lengthMenu: "Mostrar _MENU_ registros",
    zeroRecords: "No se encontraron resultados",
    emptyTable: "Ningún dato disponible",
    info: "Mostrando _START_ a _END_ de _TOTAL_",
    infoEmpty: "Mostrando 0 a 0 de 0",
    infoFiltered: "(filtrado de _MAX_ registros)",
    search: "Buscar:",
    paginate: {
      first: "Primera", previous: "Anterior", next: "Siguiente", last: "Última"
    }
  }
});

// Nuevo usuario
$('#btnNuevoUsuario').on('click', () => {
  editandoId = null;
  $('#modalUsuarioLabel').text('Registrar usuario');
  $('#formUsuario')[0].reset();
  $('#usuarioId').val('');
  $('#modalUsuario').modal('show');
});

// Validación reutilizable
function validarPassword(campos) {
  const password = $(campos.password).val();
  const confirm = $(campos.confirm).val();

  const tieneLongitud = password.length >= 5;
  const tieneMayuscula = /[A-Z]/.test(password);
  const tieneNumero = /[0-9]/.test(password);
  const coinciden = password === confirm && password !== "";

  $(campos.longitud).toggleClass('text-success', tieneLongitud).toggleClass('text-danger', !tieneLongitud);
  $(campos.mayuscula).toggleClass('text-success', tieneMayuscula).toggleClass('text-danger', !tieneMayuscula);
  $(campos.numero).toggleClass('text-success', tieneNumero).toggleClass('text-danger', !tieneNumero);
  $(campos.coinciden).toggleClass('text-success', coinciden).toggleClass('text-danger', !coinciden);

  return tieneLongitud && tieneMayuscula && tieneNumero && coinciden;
}

function validarPasswordRegistro() {
  return validarPassword({
    password: '#password',
    confirm: '#confirmPassword',
    longitud: '#minCaracteres',
    mayuscula: '#unaMayuscula',
    numero: '#unNumero',
    coinciden: '#coinciden'
  });
}

function validarPasswordCambio() {
  return validarPassword({
    password: '#passwordCambio',
    confirm: '#confirmPasswordCambio',
    longitud: '#minCaracteresCambio',
    mayuscula: '#unaMayusculaCambio',
    numero: '#unNumeroCambio',
    coinciden: '#coincidenCambio'
  });
}

$('#password, #confirmPassword').on('input', validarPasswordRegistro);
$('#passwordCambio, #confirmPasswordCambio').on('input', validarPasswordCambio);

// Guardar usuario
$('#formUsuario').on('submit', async function (e) {
  e.preventDefault();

  if (!validarPasswordRegistro()) {
    Swal.fire('❌ Error', 'La contraseña no cumple con los requisitos.', 'error');
    return;
  }

  const datos = {
    name: $('#nameControl').val(),
    username: $('#username').val(),
    password: $('#password').val(),
    status: parseInt($('#status').val()),
    gestionAmbiental: parseInt($('#gestionAmbiental').val())
  };

  try {
    const res = await fetch('/api/gestionambiental/usuarios/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });

    if (res.ok) {
      $('#modalUsuario').modal('hide');
      tabla.ajax.reload(null, false);
      Swal.fire('✅ Éxito', 'Usuario registrado correctamente', 'success');
    } else {
      const { message } = await res.json();
      throw new Error(message || 'Error al registrar usuario');
    }
  } catch (err) {
    Swal.fire('❌ Error', err.message, 'error');
  }
});

// Editar usuario
$('#tablaUsuarios').on('click', '.btn-editar', async function () {
  const id = $(this).data('id');
  try {
    const res = await fetch(`/api/gestionambiental/usuarios/${id}`);
    const data = await res.json();

    $('#editUsuarioId').val(id);
    $('#editName').val(data.name);
    $('#editUsername').val(data.username);
    $('#editStatus').val(data.status);
  $('#editGestionAmbiental').val(parseInt(data.gestionAmbiental ?? 4));

    $('#modalEditarUsuario').modal('show');
  } catch (err) {
    Swal.fire('❌ Error', 'No se pudo cargar el usuario', 'error');
  }
});

$('#formEditarUsuario').on('submit', async function (e) {
  e.preventDefault();

  const id = $('#editUsuarioId').val();
  const datos = {
    name: $('#editName').val(),
    username: $('#editUsername').val(),
    status: parseInt($('#editStatus').val()),
    gestionAmbiental: parseInt($('#editGestionAmbiental').val())
  };

  try {
    const res = await fetch(`/api/gestionambiental/usuarios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });

    if (res.ok) {
      $('#modalEditarUsuario').modal('hide');
      Swal.fire('✅ Editado', 'El usuario fue actualizado.', 'success').then(() => {
        location.reload();
      });
    } else {
      const { message } = await res.json();
      throw new Error(message || 'Error al editar');
    }
  } catch (err) {
    Swal.fire('❌ Error', err.message, 'error');
  }
});

// Eliminar usuario
$('#tablaUsuarios').on('click', '.btn-eliminar', async function () {
  const id = $(this).data('id');

  const confirmacion = await Swal.fire({
    title: '¿Eliminar usuario?',
    text: 'Esta acción no se puede deshacer.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  });

  if (confirmacion.isConfirmed) {
    try {
      const res = await fetch(`/api/gestionambiental/usuarios/${id}`, { method: 'DELETE' });
      if (res.ok) {
        tabla.ajax.reload(null, false);
        Swal.fire('✅ Eliminado', 'El usuario fue eliminado.', 'success');
      } else {
        throw new Error('Error al eliminar');
      }
    } catch (err) {
      Swal.fire('❌ Error', err.message, 'error');
    }
  }
});

// Cambiar contraseña
$('#tablaUsuarios').on('click', '.btn-password', function () {
  const id = $(this).data('id');
  $('#cambioPasswordId').val(id);
  $('#passwordCambio').val('');
  $('#confirmPasswordCambio').val('');
  $('#requisitosCambioPassword small').removeClass('text-success').addClass('text-danger');
  $('#modalPassword').modal('show');
});

$('#formPasswordCambio').on('submit', async function (e) {
  e.preventDefault();
  if (!validarPasswordCambio()) {
    Swal.fire('❌ Error', 'La nueva contraseña no cumple con los requisitos.', 'error');
    return;
  }

  const id = $('#cambioPasswordId').val();
  const nueva = $('#passwordCambio').val();

  try {
    const res = await fetch(`/api/gestionambiental/usuarios/password/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: nueva })
    });

    if (res.ok) {
      $('#modalPassword').modal('hide');
      Swal.fire('✅ Contraseña actualizada', '', 'success').then(() => {
        location.reload();
      });
    } else {
      const { message } = await res.json();
      throw new Error(message || 'Error al actualizar');
    }
  } catch (err) {
    Swal.fire('❌ Error', err.message, 'error');
  }
});
