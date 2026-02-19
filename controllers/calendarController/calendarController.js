const Salida = require('../../schemas/salidas/calendarSchema');
const moment = require('moment-timezone');

exports.getSalidas = async (req, res) => {
    try {
        const salidas = await Salida.find().populate('createdBy', 'name username');
        res.json(salidas);
    } catch (error) {
        console.error('Error al obtener salidas:', error);
        res.status(500).json({ error: 'Error al obtener salidas' });
    }
};

// Endpoint de prueba para validar fechas
exports.testFechas = async (req, res) => {
    try {
        const { fecha } = req.query;
        const hoy = moment.tz('America/Mexico_City');
        const fechaTest = moment.tz(fecha, 'America/Mexico_City');
        
        console.log('=== TEST FECHAS ===');
        console.log('Fecha recibida:', fecha);
        console.log('Fecha test (CDMX):', fechaTest.format('YYYY-MM-DD HH:mm:ss'));
        console.log('Hoy (CDMX):', hoy.format('YYYY-MM-DD HH:mm:ss'));
        
        // Comparar solo las fechas (YYYY-MM-DD) en zona horaria de CDMX
        const fechaTestStr = fechaTest.format('YYYY-MM-DD');
        const hoyStr = hoy.format('YYYY-MM-DD');
        
        console.log('Fecha test (string):', fechaTestStr);
        console.log('Hoy (string):', hoyStr);
        console.log('¿Fecha test < hoy?', fechaTestStr < hoyStr);
        console.log('¿Fecha test >= hoy?', fechaTestStr >= hoyStr);
        
        res.json({
            fechaRecibida: fecha,
            fechaTest: fechaTest.format('YYYY-MM-DD HH:mm:ss'),
            fechaTestStr: fechaTestStr,
            hoy: hoy.format('YYYY-MM-DD HH:mm:ss'),
            hoyStr: hoyStr,
            esMenor: fechaTestStr < hoyStr,
            esMayorOIgual: fechaTestStr >= hoyStr
        });
    } catch (error) {
        console.error('Error en test fechas:', error);
        res.status(500).json({ error: 'Error en test fechas' });
    }
};

exports.createSalida = async (req, res) => {
    try {
        console.log('Headers:', req.headers);
        console.log('Cookies:', req.cookies);
        console.log('User:', req.user);
        
        const { title, description, dateSalida, dateRegreso, status } = req.body;
        
        console.log('Fecha recibida:', dateSalida);
        console.log('Fecha recibida (tipo):', typeof dateSalida);
        
        // Validaciones
        if (!title || !dateSalida) {
            return res.status(400).json({ error: 'Título y fecha de salida son obligatorios' });
        }

        // Validar que la fecha de salida no sea anterior a hoy usando zona horaria de CDMX
        const fechaSalida = moment.tz(dateSalida, 'America/Mexico_City');
        const hoy = moment.tz('America/Mexico_City');
        
        console.log('=== VALIDACIÓN DE FECHAS ===');
        console.log('Fecha recibida:', dateSalida);
        console.log('Fecha de salida (CDMX):', fechaSalida.format('YYYY-MM-DD HH:mm:ss'));
        console.log('Hoy (CDMX):', hoy.format('YYYY-MM-DD HH:mm:ss'));
        
        // Comparar solo las fechas (YYYY-MM-DD) en zona horaria de CDMX
        const fechaSalidaStr = fechaSalida.format('YYYY-MM-DD');
        const hoyStr = hoy.format('YYYY-MM-DD');
        
        console.log('Fecha salida (string):', fechaSalidaStr);
        console.log('Hoy (string):', hoyStr);
        console.log('¿Fecha salida < hoy?', fechaSalidaStr < hoyStr);
        console.log('¿Fecha salida >= hoy?', fechaSalidaStr >= hoyStr);
        
        // Permitir fechas de hoy (fechaSalida >= hoy)
        if (fechaSalidaStr < hoyStr) {
            return res.status(400).json({ error: 'No se puede crear una salida para fechas pasadas' });
        }

        // Validar que la fecha de regreso no sea anterior a la fecha de salida
        if (dateRegreso) {
            const fechaRegreso = moment.tz(dateRegreso, 'America/Mexico_City');
            const fechaRegresoStr = fechaRegreso.format('YYYY-MM-DD');
            if (fechaRegresoStr < fechaSalidaStr) {
                return res.status(400).json({ error: 'La fecha de regreso no puede ser anterior a la fecha de salida' });
            }
        }

        // Obtener el usuario del token JWT
        const userId = req.user?.id || req.user?._id;
        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        // Crear la salida con fechas en zona horaria de CDMX
        const salida = await Salida.create({ 
            title, 
            description, 
            dateSalida: moment.tz(dateSalida, 'America/Mexico_City').toDate(),
            dateRegreso: dateRegreso ? moment.tz(dateRegreso, 'America/Mexico_City').toDate() : null,
            status: status || 'activa',
            createdBy: userId
        });

        const salidaPopulada = await salida.populate('createdBy', 'name username');
        
        // Emitir evento WebSocket para notificar a otros usuarios
        if (req.app.get('io')) {
            req.app.get('io').emit('salida:creada', {
                _id: salidaPopulada._id,
                title: salidaPopulada.title,
                dateSalida: salidaPopulada.dateSalida,
                dateRegreso: salidaPopulada.dateRegreso,
                status: salidaPopulada.status,
                description: salidaPopulada.description,
                createdBy: salidaPopulada.createdBy
            });
        }
        
        res.status(201).json(salidaPopulada);
    } catch (error) {
        console.error('Error al crear salida:', error);
        res.status(500).json({ error: 'Error al crear salida' });
    }
};

exports.getSalidaById = async (req, res) => {
    try {
        const salida = await Salida.findById(req.params.id).populate('createdBy', 'name username');
        if (!salida) {
            return res.status(404).json({ error: 'Salida no encontrada' });
        }
        res.json(salida);
    } catch (error) {
        console.error('Error al obtener salida:', error);
        res.status(500).json({ error: 'Error al obtener la salida' });
    }
};

exports.updateSalida = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, dateSalida, dateRegreso, status } = req.body;
        
        const salida = await Salida.findById(id);
        if (!salida) {
            return res.status(404).json({ error: 'Salida no encontrada' });
        }

        // Solo el creador puede editar
        const userId = req.user?.id || req.user?._id;
        if (salida.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'No tienes permiso para editar esta salida' });
        }

        // Validaciones
        if (!title || !dateSalida) {
            return res.status(400).json({ error: 'Título y fecha de salida son obligatorios' });
        }

        // Validar que la fecha de salida no sea anterior a hoy usando zona horaria de CDMX
        const fechaSalida = moment.tz(dateSalida, 'America/Mexico_City');
        const hoy = moment.tz('America/Mexico_City');
        
        // Comparar solo las fechas (YYYY-MM-DD) en zona horaria de CDMX
        const fechaSalidaStr = fechaSalida.format('YYYY-MM-DD');
        const hoyStr = hoy.format('YYYY-MM-DD');
        
        // Permitir fechas de hoy (fechaSalida >= hoy)
        if (fechaSalidaStr < hoyStr) {
            return res.status(400).json({ error: 'No se puede modificar una salida para fechas pasadas' });
        }

        // Validar que la fecha de regreso no sea anterior a la fecha de salida
        if (dateRegreso) {
            const fechaRegreso = moment.tz(dateRegreso, 'America/Mexico_City');
            const fechaRegresoStr = fechaRegreso.format('YYYY-MM-DD');
            if (fechaRegresoStr < fechaSalidaStr) {
                return res.status(400).json({ error: 'La fecha de regreso no puede ser anterior a la fecha de salida' });
            }
        }

        const salidaActualizada = await Salida.findByIdAndUpdate(id, {
            title,
            description,
            dateSalida: moment.tz(dateSalida, 'America/Mexico_City').toDate(),
            dateRegreso: dateRegreso ? moment.tz(dateRegreso, 'America/Mexico_City').toDate() : null,
            status: status || 'activa'
        }, { new: true }).populate('createdBy', 'name username');

        // Emitir evento WebSocket para notificar a otros usuarios
        if (req.app.get('io')) {
            req.app.get('io').emit('salida:actualizada', {
                _id: salidaActualizada._id,
                title: salidaActualizada.title,
                dateSalida: salidaActualizada.dateSalida,
                dateRegreso: salidaActualizada.dateRegreso,
                status: salidaActualizada.status,
                description: salidaActualizada.description,
                createdBy: salidaActualizada.createdBy
            });
        }

        res.json(salidaActualizada);
    } catch (error) {
        console.error('Error al actualizar salida:', error);
        res.status(500).json({ error: 'Error al actualizar la salida' });
    }
};

exports.deleteSalida = async (req, res) => {
    try {
        const salida = await Salida.findById(req.params.id);
        if (!salida) {
            return res.status(404).json({ error: 'Salida no encontrada' });
        }
        
        const userId = req.user?.id || req.user?._id;
        if (salida.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar esta salida' });
        }
        
        // Guardar información de la salida antes de eliminarla para el WebSocket
        const salidaInfo = {
            _id: salida._id,
            title: salida.title,
            dateSalida: salida.dateSalida,
            dateRegreso: salida.dateRegreso,
            status: salida.status,
            description: salida.description
        };
        
        await Salida.findByIdAndDelete(req.params.id);
        
        // Emitir evento WebSocket para notificar a otros usuarios
        if (req.app.get('io')) {
            req.app.get('io').emit('salida:eliminada', salidaInfo);
        }
        
        res.json({ message: 'Salida eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar salida:', error);
        res.status(500).json({ error: 'Error al eliminar la salida' });
    }
};

// Función para cambiar el estado de una salida
exports.cambiarEstadoSalida = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const salida = await Salida.findById(id);
        if (!salida) {
            return res.status(404).json({ error: 'Salida no encontrada' });
        }
        
        // Solo el creador puede cambiar el estado
        const userId = req.user?.id || req.user?._id;
        if (salida.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'No tienes permiso para cambiar el estado de esta salida' });
        }
        
        // Validar el estado
        const estadosValidos = ['activa', 'completada', 'cancelada'];
        if (!estadosValidos.includes(status)) {
            return res.status(400).json({ error: 'Estado no válido' });
        }
        
        const salidaActualizada = await Salida.findByIdAndUpdate(id, {
            status
        }, { new: true }).populate('createdBy', 'name username');
        
        // Emitir evento WebSocket para notificar a otros usuarios
        if (req.app.get('io')) {
            req.app.get('io').emit('salida:estado-cambiado', {
                _id: salidaActualizada._id,
                title: salidaActualizada.title,
                status: salidaActualizada.status,
                createdBy: salidaActualizada.createdBy
            });
        }
        
        res.json(salidaActualizada);
    } catch (error) {
        console.error('Error al cambiar estado de salida:', error);
        res.status(500).json({ error: 'Error al cambiar el estado de la salida' });
    }
};