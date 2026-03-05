const ActividadEconomica = require('../../schemas/empresasSchema/actividadesEconomicasSchema');

// Listar actividades económicas (solo activas si ?soloActivos=1)
exports.listar = async (req, res) => {
  try {
    const { soloActivos } = req.query;
    const filtro = { area: 6, isDeleted: false };
    if (soloActivos === '1') filtro.status = 1;
    const actividades = await ActividadEconomica.find(filtro).sort({ nombre: 1 });
    res.json(actividades);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener actividades económicas', error: err.message });
  }
};

// Crear actividad económica
exports.crear = async (req, res) => {
  try {
    const { nombre, status } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ message: 'El nombre es obligatorio' });
    const existe = await ActividadEconomica.findOne({ nombre: nombre.trim(), isDeleted: false });
    if (existe) return res.status(400).json({ message: 'Ya existe una actividad económica con ese nombre' });
    const actividad = new ActividadEconomica({ nombre: nombre.trim(), status: typeof status === 'number' ? status : 1, area: 6 });
    await actividad.save();
    res.status(201).json({ message: 'Actividad económica creada', actividad });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear actividad económica', error: err.message });
  }
};

// Actualizar actividad económica
exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, status } = req.body;
    const actividad = await ActividadEconomica.findById(id);
    if (!actividad || actividad.isDeleted) return res.status(404).json({ message: 'Actividad económica no encontrada' });
    if (typeof nombre === 'string' && nombre.trim()) actividad.nombre = nombre.trim();
    if (typeof status !== 'undefined') actividad.status = status;
    await actividad.save();
    res.json({ message: 'Actividad económica actualizada', actividad });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar actividad económica', error: err.message });
  }
};

// Eliminar (soft delete)
exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const actividad = await ActividadEconomica.findById(id);
    if (!actividad || actividad.isDeleted) return res.status(404).json({ message: 'Actividad económica no encontrada' });
    actividad.isDeleted = true;
    await actividad.save();
    res.json({ message: 'Actividad económica eliminada' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar actividad económica', error: err.message });
  }
};
