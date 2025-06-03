const Inventario = require('../../schemas/inventarioSchema/inventarioSchema');

// Crear nuevo registro
exports.crearInventario = async (req, res) => {
  try {
    console.log(req.body)
    const nuevo = new Inventario(req.body);
    await nuevo.save();

    console.log(nuevo)
    res.status(201).json({ message: 'Equipo registrado correctamente' });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Error al registrar equipo', error });
  }
};

// Obtener todos
exports.obtenerInventario = async (req, res) => {
  try {
    const lista = await Inventario.find().sort({ numero: 1 });
    res.json(lista);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener inventario', error });
  }
};

// Obtener por ID
exports.obtenerPorId = async (req, res) => {
  try {
    const equipo = await Inventario.findById(req.params.id);
    if (!equipo) return res.status(404).json({ message: 'Equipo no encontrado' });
    res.json(equipo);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener equipo', error });
  }
};

// Actualizar
exports.actualizarInventario = async (req, res) => {
  try {
    const actualizado = await Inventario.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!actualizado) return res.status(404).json({ message: 'Equipo no encontrado' });
    res.json({ message: 'Equipo actualizado', actualizado });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar equipo', error });
  }
};

// Eliminar
exports.eliminarInventario = async (req, res) => {
  try {
    const eliminado = await Inventario.findByIdAndDelete(req.params.id);
    if (!eliminado) return res.status(404).json({ message: 'Equipo no encontrado' });
    res.json({ message: 'Equipo eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar equipo', error });
  }
};
