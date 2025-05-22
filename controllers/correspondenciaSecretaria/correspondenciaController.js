const Correspondencia = require('../../schemas/correspondencia/correspondenciaSchema');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

// Crear correspondencia
exports.crearCorrespondencia = async (req, res) => {
  try {
    const archivos = req.files?.map(file => file.filename) || [];
    const fechaCDMX = moment().tz('America/Mexico_City').toDate();

    const nueva = new Correspondencia({
      ...req.body,
      archivos,
      fechaRegistro: fechaCDMX
    });

    await nueva.save();
    res.status(201).json({ message: 'Correspondencia registrada correctamente', correspondencia: nueva });
  } catch (err) {
    res.status(400).json({ message: 'Error al registrar la correspondencia', error: err.message });
  }
};

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

// Actualizar correspondencia
exports.actualizarCorrespondencia = async (req, res) => {
  try {
    const { id } = req.params;
    const datosActualizados = req.body;

    const correspondenciaExistente = await Correspondencia.findById(id);
    if (!correspondenciaExistente) {
      return res.status(404).json({ message: 'Correspondencia no encontrada' });
    }

    if (datosActualizados.fechaRegistro) {
      datosActualizados.fechaRegistro = moment.tz(datosActualizados.fechaRegistro, 'America/Mexico_City').startOf('day').toDate();
    }

    const rutaBaseArchivos = path.join(__dirname, '../../public/archivos/');
    let nuevosArchivos = correspondenciaExistente.archivos || [];

    if (req.body.archivosAEliminar) {
      const aEliminar = JSON.parse(req.body.archivosAEliminar);
      nuevosArchivos = nuevosArchivos.filter(nombre => !aEliminar.includes(nombre));
      aEliminar.forEach(nombre => {
        const ruta = path.join(rutaBaseArchivos, nombre);
        if (fs.existsSync(ruta)) {
          fs.unlinkSync(ruta);
        } else {
          console.log('Ruta no encontrada');
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