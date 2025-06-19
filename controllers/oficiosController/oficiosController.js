const Oficio = require('../../schemas/oficiosSchema/oficioSchema');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

// Obtener todos los oficios
exports.getAllOficios = async (req, res) => {
  try {
    const oficios = await Oficio.find().sort({ fecha: -1 });
    res.status(200).json({ oficios });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener los oficios', error: err.message });
  }
};

// Obtener un oficio por ID
exports.getOficioById = async (req, res) => {
  try {
    const { id } = req.params;
    const oficio = await Oficio.findById(id);
    if (!oficio) return res.status(404).json({ message: 'Oficio no encontrado' });
    res.status(200).json({ oficio });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener el oficio', error: err.message });
  }
};

// Crear un nuevo oficio
exports.createOficio = async (req, res) => {
  try {
    const datos = req.body;

    // Convertir string a arreglo si es necesario
    if (typeof datos.departamentoTurnado === 'string') {
      try {
        datos.departamentoTurnado = JSON.parse(datos.departamentoTurnado);
      } catch (e) {
        datos.departamentoTurnado = [];
      }
    }

    if (req.files && req.files.length > 0) {
      datos.archivos = req.files.map(file => file.filename);
    }

    if (datos.fecha) {
      datos.fecha = moment.tz(datos.fecha, 'America/Mexico_City').startOf('day').toDate();
    }

    const nuevoOficio = new Oficio(datos);
    await nuevoOficio.save();

    res.status(201).json({ message: 'Oficio creado correctamente', oficio: nuevoOficio });
  } catch (err) {
    res.status(400).json({ message: 'Error al crear el oficio', error: err.message });
  }
};

// Actualizar un oficio
exports.updateOficio = async (req, res) => {
  try {
    const { id } = req.params;
    const datosActualizados = req.body;

    // Convertir string a arreglo si es necesario
    if (typeof datosActualizados.departamentoTurnado === 'string') {
      try {
        datosActualizados.departamentoTurnado = JSON.parse(datosActualizados.departamentoTurnado);
      } catch (e) {
        datosActualizados.departamentoTurnado = [];
      }
    }

    const oficioExistente = await Oficio.findById(id);
    if (!oficioExistente) {
      return res.status(404).json({ message: 'Oficio no encontrado' });
    }

    if (datosActualizados.fecha) {
      datosActualizados.fecha = moment.tz(datosActualizados.fecha, 'America/Mexico_City').startOf('day').toDate();
    }

    const rutaBaseArchivos = path.join(__dirname, '../../public/archivos/');
    let nuevosArchivos = oficioExistente.archivos || [];

    // Eliminar archivos marcados
    if (req.body.archivosAEliminar) {
      const aEliminar = JSON.parse(req.body.archivosAEliminar);
      nuevosArchivos = nuevosArchivos.filter(nombre => !aEliminar.includes(nombre));
      aEliminar.forEach(nombre => {
        const ruta = path.join(rutaBaseArchivos, nombre);
        if (fs.existsSync(ruta)) {
          fs.unlinkSync(ruta);
        } else {
          console.log('Ruta no encontrada para eliminar:', nombre);
        }
      });
    }

    // Agregar nuevos archivos
    if (req.files && req.files.length > 0) {
      const nuevosSubidos = req.files.map(file => file.filename);
      nuevosArchivos = nuevosArchivos.concat(nuevosSubidos);
    }

    datosActualizados.archivos = nuevosArchivos;

    const oficioActualizado = await Oficio.findByIdAndUpdate(id, datosActualizados, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ message: 'Oficio actualizado correctamente', oficio: oficioActualizado });
  } catch (err) {
    res.status(400).json({ message: 'Error al actualizar el oficio', error: err.message });
  }
};

// Eliminar un oficio por ID
exports.deleteOficio = async (req, res) => {
  try {
    const { id } = req.params;

    const oficioEliminado = await Oficio.findByIdAndDelete(id);
    if (!oficioEliminado) {
      return res.status(404).json({ message: 'Oficio no encontrado' });
    }

    if (Array.isArray(oficioEliminado.archivos)) {
      const rutaBaseArchivos = path.join(__dirname, '../../public/archivos/');
      oficioEliminado.archivos.forEach(nombre => {
        const rutaArchivo = path.join(rutaBaseArchivos, nombre);
        if (fs.existsSync(rutaArchivo)) {
          fs.unlinkSync(rutaArchivo);
        } else {
          console.log('Ruta no encontrada para eliminar:', nombre);
        }
      });
    }

    res.status(200).json({ message: 'Oficio eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar el oficio', error: err.message });
  }
};
