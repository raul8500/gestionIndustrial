const Correspondencia = require('../../schemas/financieros/correspondenciaSchema');
// Obtener todas las correspondencias
const Usuario = require('../../schemas/usersSchema/usersSchema'); // Asegúrate que esta ruta sea correcta
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');


// Crear correspondencia
exports.crearCorrespondencia = async (req, res) => {
  try {
    const archivos = req.files?.map(file => file.filename) || [];
    const fechaCDMX = moment.tz('America/Mexico_City').format('YYYY-MM-DDTHH:mm:ss');
    const fechaRegistro = moment.utc(fechaCDMX).toDate();

    // Procesar fechas para evitar problemas de zona horaria
    let datos = {
      ...req.body,
      archivos,
      turnadoA: req.body.turnadoA === '' ? null : req.body.turnadoA,
      createdAt: fechaRegistro
    };

    // Convertir fechas a zona horaria local
    if (req.body.fechaOficio) {
      datos.fechaOficio = moment.tz(req.body.fechaOficio, 'America/Mexico_City').startOf('day').toDate();
    }
    if (req.body.fechaRecepcion) {
      datos.fechaRecepcion = moment.tz(req.body.fechaRecepcion, 'America/Mexico_City').startOf('day').toDate();
    }

    const nueva = new Correspondencia(datos);
    await nueva.save();

    // ✅ Emitir notificación SOLO si tiene turnadoA válido
    if (nueva.turnadoA) {
      const io = req.app.get('io');
      io.emit('correspondencia-asignada', {
        mensaje: '📬 Nueva correspondencia asignada',
        para: nueva.turnadoA.toString(),
        folio: nueva.numeroOficio,
        id: nueva._id
      });
    }

    res.status(201).json({ message: 'Correspondencia registrada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al registrar correspondencia' });
  }
};

// Obtener todas las correspondencias
exports.obtenerCorrespondencias = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orden = 'normal' } = req.query;

    // Consultar permisos del usuario desde la BD
    const usuario = await Usuario.findById(userId);
    if (!usuario) return res.status(401).json({ message: 'Usuario no encontrado' });

    // Solo ve las que le han sido turnadas si no tiene permiso para crear usuarios
    const filtro = usuario.puedeCrearUsuarios ? {} : { turnadoA: userId };

    let sortOption = {};
    
    switch(orden) {
      case 'normal':
        // Orden normal (sin ordenamiento específico)
        sortOption = {};
        break;
      case 'reciente':
        // Del más reciente al más antiguo
        sortOption = { fechaOficio: -1 };
        break;
      case 'antiguo':
        // Del más antiguo al más reciente
        sortOption = { fechaOficio: 1 };
        break;
      default:
        // Por defecto, orden normal
        sortOption = {};
    }

    const correspondencias = await Correspondencia.find(filtro)
      .populate('turnadoA', 'name username')
      .sort(sortOption);

    res.json(correspondencias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener correspondencias' });
  }
};


// Obtener correspondencia por ID
exports.obtenerCorrespondenciaPorId = async (req, res) => {
  try {
    const correspondencia = await Correspondencia.findById(req.params.id)
      .populate('turnadoA', 'name username');

    if (!correspondencia) {
      return res.status(404).json({ message: 'Correspondencia no encontrada' });
    }

    res.json(correspondencia);
  } catch (error) {
    res.status(500).json({ message: 'Error al buscar correspondencia' });
  }
};

// Actualizar correspondencia
exports.actualizarCorrespondencia = async (req, res) => {
  try {
        // Si solo se quiere actualizar el status
    if (Object.keys(req.body).length === 1 && req.body.status) {
      const actualizada = await Correspondencia.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true }
      );

      const io = req.app.get('io');
      io.emit('correspondencia-actualizada', {
        id: actualizada._id,
        para: actualizada.turnadoA?.toString() || null
      });

      return res.json({ message: 'Estatus actualizado' });
    }

    const id = req.params.id;
    const correspondencia = await Correspondencia.findById(id);
    if (!correspondencia) return res.status(404).json({ message: 'Correspondencia no encontrada' });

    const nuevosArchivos = req.files?.map(f => f.filename) || [];
    const archivosExistentes = req.body.archivosExistentes || [];
    const archivosFinales = Array.isArray(archivosExistentes)
      ? [...archivosExistentes, ...nuevosArchivos]
      : [archivosExistentes, ...nuevosArchivos];

    // Borrar archivos eliminados
    const archivosAEliminar = JSON.parse(req.body.archivosAEliminar || '[]');
    for (const archivo of archivosAEliminar) {
      const ruta = path.join(__dirname, '../public/archivos/', archivo);
      if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    }

    const nuevoTurnado = req.body.turnadoA === '' ? null : req.body.turnadoA;
    const turnoAnterior = correspondencia.turnadoA?.toString() || null;

    // Procesar fechas para evitar problemas de zona horaria
    let datosActualizados = { ...req.body, turnadoA: nuevoTurnado, archivos: archivosFinales };
    
    if (req.body.fechaOficio) {
      datosActualizados.fechaOficio = moment.tz(req.body.fechaOficio, 'America/Mexico_City').startOf('day').toDate();
    }
    if (req.body.fechaRecepcion) {
      datosActualizados.fechaRecepcion = moment.tz(req.body.fechaRecepcion, 'America/Mexico_City').startOf('day').toDate();
    }

    const actualizada = await Correspondencia.findByIdAndUpdate(
      id,
      datosActualizados,
      { new: true }
    );

    // Notificación y actualización
    const io = req.app.get('io');
    io.emit('correspondencia-actualizada', {
      id: actualizada._id,
      para: nuevoTurnado
    });

    if (nuevoTurnado && nuevoTurnado !== turnoAnterior) {
      io.emit('correspondencia-asignada', {
        mensaje: '📬 Nueva correspondencia asignada',
        para: nuevoTurnado,
        folio: actualizada.numeroOficio,
        id: actualizada._id
      });
    }

    res.json({ message: 'Correspondencia actualizada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar correspondencia' });
  }
};


// Eliminar correspondencia
exports.eliminarCorrespondencia = async (req, res) => {
  try {
    const correspondencia = await Correspondencia.findById(req.params.id);
    if (!correspondencia) {
      return res.status(404).json({ message: 'Correspondencia no encontrada' });
    }

    // Eliminar archivos físicos
    for (const archivo of correspondencia.archivos) {
      const ruta = path.join(__dirname, '../public/archivos/', archivo);
      if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    }

    await correspondencia.deleteOne();

    // 🔁 Emitir evento para que otros usuarios actualicen su tabla
    const io = req.app.get('io');
    io.emit('correspondencia-actualizada', {
      id: correspondencia._id,
      para: correspondencia.turnadoA?.toString() || null
    });

    res.json({ message: 'Correspondencia eliminada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar correspondencia' });
  }
};

// Generar respaldo en ZIP con .json, .txt y archivos adjuntos
exports.respaldoCorrespondencia = async (req, res) => {
  try {
    const correspondencia = await Correspondencia.findById(req.params.id).populate('turnadoA');

    if (!correspondencia) {
      return res.status(404).json({ message: 'Correspondencia no encontrada' });
    }

    // Contenido .json
    const jsonContent = JSON.stringify(correspondencia, null, 2);

    // Contenido .txt legible
    const txtContent = `
    Folio: ${correspondencia.numeroOficio}
    Fecha Oficio: ${correspondencia.fechaOficio?.toISOString().split('T')[0] || ''}
    Remitente: ${correspondencia.remitente}
    Asunto: ${correspondencia.asunto}
    Tipo: ${correspondencia.tipoCorrespondencia}
    Turnado a: ${correspondencia.turnadoA?.name || 'No asignado'}
    Observaciones: ${correspondencia.observaciones || ''}
    Tipo Respuesta: ${correspondencia.tipoRespuesta || ''}
    Tiempo Respuesta: ${correspondencia.tiempoRespuesta || ''}
    Status: ${correspondencia.status === 1 ? 'Pendiente' : correspondencia.status === 2 ? 'Atendido' : 'Desconocido'}
    Fecha Registro: ${correspondencia.fechaRegistro?.toISOString()}
    `;

    // Headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=respaldo_correspondencia_${req.params.id}.zip`);

    // Crear el archivo ZIP
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    // Añadir los contenidos de respaldo
    archive.append(jsonContent, { name: `correspondencia_${req.params.id}.json` });
    archive.append(txtContent, { name: `correspondencia_${req.params.id}.txt` });

    // Incluir archivos adjuntos si existen
    if (Array.isArray(correspondencia.archivos)) {
      for (const archivo of correspondencia.archivos) {
        const ruta = path.join(__dirname, '../../public/archivos/', archivo);
        if (fs.existsSync(ruta)) {
          archive.file(ruta, { name: `adjuntos/${archivo}` });
        }
      }
    }

    archive.finalize();
  } catch (error) {
    console.error('Error al generar respaldo:', error);
    res.status(500).json({ message: 'Error al generar respaldo' });
  }
};

exports.enviarARevision = async (req, res) => {
  try {
    const { id } = req.params;

    const correspondencia = await Correspondencia.findById(id);
    if (!correspondencia) {
      return res.status(404).json({ message: 'Correspondencia no encontrada' });
    }

    // ❌ Si ya está en revisión, no dejar reenviar
    if (correspondencia.status === 3) {
      return res.status(400).json({ message: 'La correspondencia ya está en revisión.' });
    }

    correspondencia.status = 3;
    await correspondencia.save();

    const io = req.app.get('io');

    io.emit('correspondencia-enviada-revision', {
      id: correspondencia._id,
      folio: correspondencia.numeroOficio,
      remitente: correspondencia.remitente
    });

    io.emit('correspondencia-actualizada');

    res.json({ message: 'La correspondencia fue enviada a revisión.' });
  } catch (error) {
    console.error('Error al enviar a revisión:', error);
    res.status(500).json({ message: 'Error al enviar a revisión' });
  }
};


