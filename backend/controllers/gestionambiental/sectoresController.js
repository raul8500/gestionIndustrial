const Sector = require('../../schemas/empresasSchema/sectoresSchema');

// Listar sectores (solo activos si ?soloActivos=1)
exports.listar = async (req, res) => {
  try {
    const { soloActivos } = req.query;
    const filtro = { area: 6, isDeleted: false };
    if (soloActivos === '1') filtro.status = 1;
    const sectores = await Sector.find(filtro).sort({ nombre: 1 });
    res.json(sectores);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener sectores', error: err.message });
  }
};

// Crear sector
exports.crear = async (req, res) => {
  try {
    const { nombre, status } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ message: 'El nombre es obligatorio' });
    const existe = await Sector.findOne({ nombre: nombre.trim(), isDeleted: false });
    if (existe) return res.status(400).json({ message: 'Ya existe un sector con ese nombre' });
    const sector = new Sector({ nombre: nombre.trim(), status: typeof status === 'number' ? status : 1, area: 6 });
    await sector.save();
    res.status(201).json({ message: 'Sector creado', sector });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear sector', error: err.message });
  }
};

// Actualizar sector
exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, status } = req.body;
    const sector = await Sector.findById(id);
    if (!sector || sector.isDeleted) return res.status(404).json({ message: 'Sector no encontrado' });
    if (typeof nombre === 'string' && nombre.trim()) sector.nombre = nombre.trim();
    if (typeof status !== 'undefined') sector.status = status;
    await sector.save();
    res.json({ message: 'Sector actualizado', sector });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar sector', error: err.message });
  }
};

// Eliminar (soft delete)
exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const sector = await Sector.findById(id);
    if (!sector || sector.isDeleted) return res.status(404).json({ message: 'Sector no encontrado' });
    sector.isDeleted = true;
    await sector.save();
    res.json({ message: 'Sector eliminado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar sector', error: err.message });
  }
};
