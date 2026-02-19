const Correspondencia = require('../../schemas/correspondencia/correspondenciaSchema');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

// Obtener todas
exports.obtenerCorrespondencias = async (req, res) => {
  try {
    const registros = await Correspondencia.find({ eliminado: false }).sort({ createdAt: -1 });
    res.json(registros);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener las correspondencias', error: err.message });
  }
};

// Obtener una por ID
exports.obtenerCorrespondencia = async (req, res) => {
  try {
    const registro = await Correspondencia.findById(req.params.id);
    if (!registro) return res.status(404).json({ message: 'Correspondencia no encontrada' });
    res.json(registro);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener la correspondencia', error: err.message });
  }
};

// Crear correspondencia
exports.crearCorrespondencia = async (req, res) => {
  try {
    const archivos = req.files?.map(file => file.filename) || [];

    // Fecha de registro con hora actual
    let fechaRegistro;
    if (req.body.fechaRegistro) {
      const hoy = moment().tz('America/Mexico_City');
      fechaRegistro = moment.tz(`${req.body.fechaRegistro}T${hoy.format('HH:mm:ss')}`, 'America/Mexico_City').toDate();
    } else {
      fechaRegistro = moment().tz('America/Mexico_City').toDate();
    }

    // Corregir fechaOficio si viene en el body
    let fechaOficio = req.body.fechaOficio;
    if (fechaOficio) {
      fechaOficio = moment.tz(fechaOficio + 'T12:00:00', 'America/Mexico_City').toDate();
    }

    const nueva = new Correspondencia({
      ...req.body,
      archivos,
      fechaRegistro,
      fechaOficio
    });

    await nueva.save();
    res.status(201).json({ message: 'Correspondencia registrada correctamente', correspondencia: nueva });
  } catch (err) {
    res.status(400).json({ message: 'Error al registrar la correspondencia', error: err.message });
  }
};

// Actualizar correspondencia
exports.actualizarCorrespondencia = async (req, res) => {
  try {
    const { id } = req.params;
    const datosActualizados = req.body;

    const correspondenciaExistente = await Correspondencia.findById(id);
    if (!correspondenciaExistente) {
      return res.status(404).json({ message: 'Correspondencia no encontrada' });
    }

    // ✅ Solo actualizar fechaRegistro si es distinta
    if (datosActualizados.fechaRegistro) {
      const fechaNueva = datosActualizados.fechaRegistro;
      const fechaActual = moment(correspondenciaExistente.fechaRegistro).format('YYYY-MM-DD');

      if (fechaNueva !== fechaActual) {
        const horaActual = moment().tz('America/Mexico_City').format('HH:mm:ss');
        datosActualizados.fechaRegistro = moment.tz(`${fechaNueva}T${horaActual}`, 'America/Mexico_City').toDate();
      } else {
        // Si no cambió, elimínala del objeto para no actualizarla
        delete datosActualizados.fechaRegistro;
      }
    }

    // ✅ Ajustar fechaOficio si viene
    if (datosActualizados.fechaOficio) {
      datosActualizados.fechaOficio = moment.tz(datosActualizados.fechaOficio + 'T12:00:00', 'America/Mexico_City').toDate();
    }

    // Archivos
    const rutaBaseArchivos = path.join(__dirname, '../../public/archivos/');
    let nuevosArchivos = correspondenciaExistente.archivos || [];

    if (req.body.archivosAEliminar) {
      const aEliminar = JSON.parse(req.body.archivosAEliminar);
      nuevosArchivos = nuevosArchivos.filter(nombre => !aEliminar.includes(nombre));
      aEliminar.forEach(nombre => {
        const ruta = path.join(rutaBaseArchivos, nombre);
        if (fs.existsSync(ruta)) {
          fs.unlinkSync(ruta);
        }
      });
    }

    if (req.files && req.files.length > 0) {
      const nuevosSubidos = req.files.map(file => file.filename);
      nuevosArchivos = nuevosArchivos.concat(nuevosSubidos);
    }

    datosActualizados.archivos = nuevosArchivos;

    const correspondenciaActualizada = await Correspondencia.findByIdAndUpdate(id, datosActualizados, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ message: 'Correspondencia actualizada correctamente', correspondencia: correspondenciaActualizada });
  } catch (err) {
    res.status(400).json({ message: 'Error al actualizar la correspondencia', error: err.message });
  }
};

// Eliminar correspondencia (física y lógica)
exports.eliminarCorrespondencia = async (req, res) => {
  try {
    const { id } = req.params;

    const correspondenciaEliminada = await Correspondencia.findByIdAndDelete(id);
    if (!correspondenciaEliminada) {
      return res.status(404).json({ message: 'Correspondencia no encontrada' });
    }

    if (Array.isArray(correspondenciaEliminada.archivos)) {
      const rutaBaseArchivos = path.join(__dirname, '../../public/archivos/');
      correspondenciaEliminada.archivos.forEach(nombre => {
        const rutaArchivo = path.join(rutaBaseArchivos, nombre);
        if (fs.existsSync(rutaArchivo)) {
          fs.unlinkSync(rutaArchivo);
        } else {
          console.log('Ruta no encontrada');
        }
      });
    }

    res.status(200).json({ message: 'Correspondencia eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar la correspondencia', error: err.message });
  }
};