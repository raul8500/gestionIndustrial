let tabla;
// Variable global para el orden actual
let ordenActual = 'normal';

$(document).ready(() => {
    console.log('🚀 Correspondencia.js cargado correctamente');
    console.log('📊 Inicializando tabla de correspondencia...');
    console.log('🔍 Verificando elementos del DOM...');
    
    // Verificar que los elementos existan
    console.log('Tabla encontrada:', $('#tablaCorrespondencia').length);
    console.log('Botón nuevo encontrado:', $('#btnNuevo').length);
    console.log('Modal encontrado:', $('#modalCorrespondencia').length);
    
    const socket = io();

    socket.on('correspondencia-asignada', data => {
        const usuarioActual = userInfo._id;
        if (usuarioActual === data.para) {
            Swal.fire({
                icon: 'info',
                title: '📥 Nueva correspondencia',
                text: `Folio: ${data.folio}`,
                confirmButtonText: 'Ver ahora'
            }).then(() => {
                window.location.href = '/correspondenciaFinancieros';
                tabla.ajax.reload(); // 🔄 Recargar DataTable automáticamente
            });
        }
    });

    socket.on('correspondencia-actualizada', () => {
        tabla.ajax.reload(); // 🔄 Siempre recarga para todos
    });


    socket.on('correspondencia-enviada-revision', data => {
        if (userInfo.puedeCrearUsuarios) {
            Swal.fire({
            icon: 'info',
            title: '📤 Correspondencia recibida para revisión',
            text: `Folio: ${data.folio} - Remitente: ${data.remitente}`
            });
        }
    });




    cargarUsuarios();

    console.log('⏳ Esperando que userInfo esté disponible...');
    console.log('🔍 Estado actual de userInfo:', typeof userInfo, userInfo);
    
    // Timeout de seguridad para evitar esperar indefinidamente
    setTimeout(() => {
        if (esperarInfoUser) {
            clearInterval(esperarInfoUser);
            console.error('❌ Timeout: userInfo no disponible después de 10 segundos');
            console.log('🔧 Intentando inicializar con datos por defecto...');
            // Verificar que la tabla no esté ya inicializada
            if (!tabla || !tabla.table()) {
                inicializarTablaConPermisosPorDefecto();
            } else {
                console.log('⚠️ La tabla ya está inicializada, saltando inicialización por defecto...');
            }
        }
    }, 10000);
    
    const esperarInfoUser = setInterval(() => {
        console.log('🔄 Verificando userInfo:', typeof userInfo, userInfo);
        if (typeof userInfo !== 'undefined' && userInfo._id) {
            clearInterval(esperarInfoUser); // detener el intervalo una vez que ya está cargado
            console.log('👤 UserInfo cargado:', userInfo);
            console.log('✅ UserInfo validado, procediendo con la inicialización...');

            // Verificar que la tabla no esté ya inicializada
            if (!tabla || !tabla.table()) {
                // Llamar a la función de inicialización con los datos del usuario
                console.log('🎯 Llamando a inicializarTabla con:', userInfo);
                inicializarTabla(userInfo);
            } else {
                console.log('⚠️ La tabla ya está inicializada, saltando inicialización...');
            }

                $('#btnNuevo').click(() => {
                $('#formCorrespondencia')[0].reset();
                $('#idCorrespondencia').val('');
                $('#modalCorrespondencia').modal('show');
    });

        // Enviar a revisión (usuarios sin permisos)
    $('#tablaCorrespondencia tbody').on('click', '.enviar-revision', async function () {
        const id = $(this).data('id');

        const confirm = await Swal.fire({
            icon: 'question',
            title: '¿Enviar a revisión?',
            text: 'Se notificará a los responsables para su revisión.',
            showCancelButton: true,
            confirmButtonText: 'Sí, enviar'
        });

        if (confirm.isConfirmed) {
            try {
                const res = await fetch(`/api/financieros/correspondencia/enviar-revision/${id}`, {
                    method: 'POST'
                });

                if (!res.ok) throw new Error('No se pudo enviar a revisión');

                const json = await res.json();
                Swal.fire('📤 Enviado', json.message, 'success');
            } catch (err) {
                console.error(err);
                Swal.fire('❌ Error', 'No se pudo enviar a revisión', 'error');
            }
        }
    });

    // Aprobar status (marcar como atendido)
    $('#tablaCorrespondencia tbody').on('click', '.aprobar-status', async function () {
        const id = $(this).data('id');
        const confirm = await Swal.fire({
            icon: 'question',
            title: '¿Marcar como atendido?',
            showCancelButton: true,
            confirmButtonText: 'Sí, aprobar'
        });

        if (confirm.isConfirmed) {
            await fetch(`/api/financieros/correspondencia/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 2 })
            });
            Swal.fire('✅ Estado actualizado', 'Marcado como atendido.', 'success');
            tabla.ajax.reload();
        }
    });

    // Rechazar status (regresar a pendiente)
    $('#tablaCorrespondencia tbody').on('click', '.rechazar-status', async function () {
        const id = $(this).data('id');
        const confirm = await Swal.fire({
            icon: 'warning',
            title: '¿Rechazar y marcar como pendiente?',
            showCancelButton: true,
            confirmButtonText: 'Sí, regresar'
        });

        if (confirm.isConfirmed) {
            await fetch(`/api/financieros/correspondencia/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 1 })
            });
            Swal.fire('🔁 Estado actualizado', 'Marcado como pendiente.', 'success');
            tabla.ajax.reload();
        }
    });


    $('#tablaCorrespondencia tbody').on('click', '.editar', async function () {
        const id = $(this).data('id');
        const res = await fetch(`/api/financieros/correspondencia/${id}`);
        const data = await res.json();

        $('#idCorrespondencia').val(data._id);
        $('#numeroOficio').val(data.numeroOficio);
        $('#fechaOficio').val(data.fechaOficio ? new Date(data.fechaOficio).toISOString().split('T')[0] : '');
        $('#fechaRecepcion').val(data.fechaRecepcion ? new Date(data.fechaRecepcion).toISOString().split('T')[0] : '');
        $('#tipoCorrespondencia').val(data.tipoCorrespondencia);
        $('#remitente').val(data.remitente);
        $('#asunto').val(data.asunto);
        $('#tipoRespuesta').val(data.tipoRespuesta);
        $('#turnadoA').val(data.turnadoA?._id || '');
        $('#observaciones').val(data.observaciones);
        $('#tiempoRespuesta').val(data.tiempoRespuesta);
        $('#status').val(data.status);

        // Mostrar archivos actuales
        const lista = $('#listaArchivosActuales');
        const contenedor = $('#archivoActualContainer');
        lista.empty().show();
        contenedor.show();
        contenedor.data('aEliminar', []);

        if (data.archivos && data.archivos.length > 0) {
            data.archivos.forEach(nombre => {
                lista.append(`
        <div class="archivo-item bg-light border rounded p-2 me-2 mb-2 d-flex align-items-center" data-nombre="${nombre}">
          <a href="/archivos/${nombre}" target="_blank" class="me-2">${nombre}</a>
          <button type="button" class="btn btn-sm btn-outline-danger btn-eliminar-archivo"><i class="fas fa-times"></i></button>
        </div>
      `);
            });
        }

        $('#modalCorrespondencia').modal('show');
    });

    $('#tablaCorrespondencia tbody').on('click', '.eliminar', async function () {
        const id = $(this).data('id');
        const confirm = await Swal.fire({
            icon: 'warning',
            title: '¿Eliminar?',
            text: 'Esta acción no se puede deshacer',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar'
        });

        if (confirm.isConfirmed) {
            const res = await fetch(`/api/financieros/correspondencia/${id}`, { method: 'DELETE' });
            const json = await res.json();
            Swal.fire('✅ Eliminado', json.message, 'success');
            tabla.ajax.reload();
        }
    });

    $('#formCorrespondencia').submit(async function (e) {
        e.preventDefault();
        const id = $('#idCorrespondencia').val();
        const form = new FormData(this);
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/financieros/correspondencia/${id}` : '/api/financieros/correspondencia/';

        if (id) {
            const data = await fetch(`/api/financieros/correspondencia/${id}`);
            const json = await data.json();

            // Archivos que no se eliminaron
            const eliminados = $('#archivoActualContainer').data('aEliminar') || [];
            const archivosRestantes = json.archivos.filter(nombre => !eliminados.includes(nombre));
            archivosRestantes.forEach(nombre => form.append('archivosExistentes', nombre));
            form.append('archivosAEliminar', JSON.stringify(eliminados));
        }

        const res = await fetch(url, {
            method,
            body: form
        });

        if (res.ok) {
            $('#modalCorrespondencia').modal('hide');
            Swal.fire('✅ Guardado', 'La correspondencia fue registrada', 'success');
            tabla.ajax.reload();
        } else {
            Swal.fire('❌ Error', 'Ocurrió un error al guardar', 'error');
        }
    });

    $('#listaArchivosActuales').on('click', '.btn-eliminar-archivo', function () {
        const item = $(this).closest('.archivo-item');
        const nombre = item.data('nombre');
        const contenedor = $('#archivoActualContainer');
        const eliminados = contenedor.data('aEliminar') || [];
        eliminados.push(nombre);
        contenedor.data('aEliminar', eliminados);
        item.remove();
    });

    $('#tablaCorrespondencia tbody').on('click', '.respaldar', async function () {
        const id = $(this).data('id');

        const confirm = await Swal.fire({
            icon: 'question',
            title: '¿Respaldar registro?',
            text: 'Esto generará un respaldo individual de esta correspondencia.',
            showCancelButton: true,
            confirmButtonText: 'Sí, respaldar'
        });

        if (confirm.isConfirmed) {
            try {
                const res = await fetch(`/api/financieros/correspondencia/respaldo/${id}`);

                if (!res.ok) {
                    throw new Error('No se pudo generar el respaldo');
                }

                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = `respaldo_correspondencia_${id}.zip`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);

                Swal.fire('✅ Respaldado', 'El respaldo se ha generado correctamente.', 'success');
            } catch (err) {
                console.error(err);
                Swal.fire('❌ Error', 'No se pudo generar el respaldo.', 'error');
            }
        }
    });
        }
    }, 100);

    // Funcionalidad de ordenamiento con radio buttons (después de que la tabla esté inicializada)
    $('input[name="ordenRegistros"]').off('change').on('change', function() {
        ordenActual = $(this).val();
        
        // Recargar la tabla con el nuevo orden desde el backend
        if (tabla) {
            tabla.ajax.reload(null, false);
        }
    });

});

async function cargarUsuarios() {
    const res = await fetch('/api/financieros/usuarios');
    const usuarios = await res.json();
    const $select = $('#turnadoA');
    $select.empty().append('<option value="">-- Selecciona --</option>');
    usuarios.forEach(u => {
        $select.append(`<option value="${u._id}">${u.name} (${u.username})</option>`);
    });

}

// Función de inicialización por defecto cuando userInfo no está disponible
function inicializarTablaConPermisosPorDefecto() {
    console.log('🔧 Inicializando tabla con permisos por defecto...');
    
    // Asumir permisos básicos por defecto
    const permisosPorDefecto = {
        puedeCrearUsuarios: false,
        _id: 'default'
    };
    
    // Crear una variable temporal para la inicialización
    const userInfoTemp = permisosPorDefecto;
    
    // Llamar a la función de inicialización con permisos por defecto
    inicializarTabla(userInfoTemp);
}

// Función principal de inicialización de la tabla
function inicializarTabla(userInfoData) {
    // Verificar que no se esté ejecutando ya
    if (window.tablaInicializandose) {
        console.log('⚠️ La tabla ya se está inicializando, saltando...');
        return;
    }
    
    window.tablaInicializandose = true;
    console.log('🔧 Inicializando tabla con datos:', userInfoData);
    console.log('📊 Variable ordenActual disponible:', ordenActual);
    
    // Verificar si la tabla ya está inicializada
    if (tabla && tabla.table()) {
        console.log('⚠️ La tabla ya está inicializada, destruyendo antes de reinicializar...');
        tabla.destroy();
        tabla = null;
    }
    
    const columnasBase = [
        { data: 'numeroOficio', title: 'No. Oficio' },
        { data: 'fechaOficio', title: 'Fecha', render: d => d ? new Date(d).toLocaleDateString('es-ES') : '' },
        { data: 'remitente', title: 'Remitente' },
        { data: 'asunto', title: 'Asunto' },
        {
            data: 'status',
            title: 'Estatus',
            render: function (status, type, row) {
                                        let badge = '';
                        switch (status) {
                            case 1:
                                badge = `<span class="status-badge status-pendiente">Pendiente</span>`;
                                break;
                            case 2:
                                badge = `<span class="status-badge status-atendido">Atendido</span>`;
                                break;
                            case 3:
                                badge = `<span class="status-badge status-revision">Para revisión</span>`;
                                break;
                            default:
                                badge = `<span class="status-badge status-desconocido">Desconocido</span>`;
                                break;
                        }

                if (userInfoData.puedeCrearUsuarios && status === 3) {
                    return `${badge}<br>
                        <button class="btn btn-outline-success btn-sm mt-1 aprobar-status" data-id="${row._id}"><i class="fas fa-check"></i></button>
                        <button class="btn btn-outline-danger btn-sm mt-1 rechazar-status" data-id="${row._id}"><i class="fas fa-times"></i></button>`;
                }
                return badge;
            }
        },
        { data: 'turnadoA', title: 'Turnado a', render: d => d?.name || '' },
        {
            data: 'archivos',
            title: 'Docs',
            orderable: false,
            render: function (archivos) {
                if (!Array.isArray(archivos) || archivos.length === 0) {
                    return '<span class="text-muted">Sin archivos</span>';
                }

                return archivos.map(nombre => `
                    <a href="/archivos/${nombre}" target="_blank" class="btn btn-sm btn-outline-primary me-1" title="${nombre}">
                        <i class="fas fa-file-download"></i>
                    </a>
                `).join('');
            }
        }
    ];

    // Columna de acciones según permisos
    if (userInfoData.puedeCrearUsuarios) {
        columnasBase.push({
            data: null,
            title: 'Acciones',
            orderable: false,
            render: function (data, type, row) {
                return `
                    <button class="btn btn-warning btn-sm editar" data-id="${row._id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm eliminar" data-id="${row._id}"><i class="fas fa-trash-alt"></i></button>
                    <button class="btn btn-info btn-sm respaldar" data-id="${row._id}"><i class="fas fa-save"></i></button>
                `;
            }
        });
    } else {
        columnasBase.push({
            data: null,
            title: 'Acción',
            orderable: false,
            render: function (data, type, row) {
                if (row.status !== 1) {
                    return `<button class="btn btn-outline-secondary btn-sm" disabled>Sin acciones</button>`;
                }
                return `<button class="btn btn-outline-primary btn-sm enviar-revision" data-id="${row._id}">📤 Enviar a revisión</button>`;
            }
        });
    }

    console.log('🔧 Inicializando DataTable con columnas:', columnasBase.length);
    
    try {
        tabla = $('#tablaCorrespondencia').DataTable({
            ajax: {
                url: '/api/financieros/correspondencia/',
                data: function(d) {
                    d.orden = ordenActual;
                },
                dataSrc: ''
            },
            columns: columnasBase,
            order: [],
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
    } catch (error) {
        console.error('❌ Error al inicializar DataTable:', error);
        window.tablaInicializandose = false;
        return;
    }
    
    console.log('✅ DataTable inicializado correctamente');
    console.log('📊 Tabla lista para mostrar datos');
    
    // Reset de la bandera de inicialización
    window.tablaInicializandose = false;
}



