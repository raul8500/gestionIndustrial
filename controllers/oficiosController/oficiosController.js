const Oficio = require('../../schemas/oficiosSchema/oficioSchema');
const fs = require('fs');
const path = require('path');

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

        if (req.files && req.files.length > 0) {
            datos.archivos = req.files.map(file => file.filename);
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

        const oficioExistente = await Oficio.findById(id);
        if (!oficioExistente) {
            return res.status(404).json({ message: 'Oficio no encontrado' });
        }

        const rutaBaseArchivos = path.join(__dirname, '../../public/archivos/');
        let nuevosArchivos = oficioExistente.archivos || [];

        // 🔴 Eliminar archivos marcados
        if (req.body.archivosAEliminar) {
            const aEliminar = JSON.parse(req.body.archivosAEliminar);

            // Filtra y elimina físicamente
            nuevosArchivos = nuevosArchivos.filter(nombre => !aEliminar.includes(nombre));
            aEliminar.forEach(nombre => {
                const ruta = path.join(rutaBaseArchivos, nombre);
                if (fs.existsSync(ruta)){
                  fs.unlinkSync(ruta); // Eliminar el archivo físico
                }else{
                  console.log('Ruta no encontrada')
                }
            });
        }

        // ✅ Agregar nuevos archivos si se subieron
        if (req.files && req.files.length > 0) {
            const nuevosSubidos = req.files.map(file => file.filename);
            nuevosArchivos = nuevosArchivos.concat(nuevosSubidos);
        }

        // ✅ Asignar archivos actualizados al body
        datosActualizados.archivos = nuevosArchivos;

        // 🔁 Actualizar oficio
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

        // Encontrar y eliminar el oficio
        const oficioEliminado = await Oficio.findByIdAndDelete(id);
        if (!oficioEliminado) {
            return res.status(404).json({ message: 'Oficio no encontrado' });
        }

        // Eliminar los archivos si existen
        if (Array.isArray(oficioEliminado.archivos)) {
            const rutaBaseArchivos = path.join(__dirname, '../../public/archivos/');
            oficioEliminado.archivos.forEach(nombre => {
                const rutaArchivo = path.join(rutaBaseArchivos, nombre);
                if (fs.existsSync(rutaArchivo)){
                  fs.unlinkSync(rutaArchivo); // Eliminar los archivos físicos
                }else{
                  console.log('Ruta no encontrada')
                }
            });
        }

        res.status(200).json({ message: 'Oficio eliminado correctamente' });
    } catch (err) {
        res.status(500).json({ message: 'Error al eliminar el oficio', error: err.message });
    }
};
