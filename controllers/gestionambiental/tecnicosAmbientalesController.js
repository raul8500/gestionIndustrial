const Tecnico = require('../../schemas/gestionambiental/tecnicosAmbientalesSchema');

// Listar técnicos (opcional: ?soloActivos=1)
exports.listar = async (req, res) => {
  try {
    const { soloActivos } = req.query;
    const filtro = { area: 6, isDeleted: false };
    if (soloActivos === '1') filtro.status = 1;
    const tecnicos = await Tecnico.find(filtro).sort({ nombre: 1 });
    res.json(tecnicos);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener técnicos', error: err.message });
  }
};

// Obtener por id
exports.obtenerPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const tec = await Tecnico.findById(id);
    if (!tec || tec.isDeleted) return res.status(404).json({ message: 'Técnico no encontrado' });
    res.json(tec);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener técnico', error: err.message });
  }
};

// Crear
exports.crear = async (req, res) => {
  try {
    const { nombre, status } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ message: 'El nombre es obligatorio' });
    const existe = await Tecnico.findOne({ nombre: nombre.trim(), isDeleted: false });
    if (existe) return res.status(400).json({ message: 'Ya existe un técnico con ese nombre' });
    const tec = new Tecnico({ nombre: nombre.trim(), status: typeof status === 'number' ? status : 1, area: 6 });
    await tec.save();
    res.status(201).json({ message: 'Técnico creado', tecnico: tec });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear técnico', error: err.message });
  }
};

// Actualizar
exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, status } = req.body;
    const tec = await Tecnico.findById(id);
    if (!tec || tec.isDeleted) return res.status(404).json({ message: 'Técnico no encontrado' });
    if (typeof nombre === 'string' && nombre.trim()) tec.nombre = nombre.trim();
    if (typeof status !== 'undefined') tec.status = status;
    await tec.save();
    res.json({ message: 'Técnico actualizado', tecnico: tec });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar técnico', error: err.message });
  }
};

// Eliminar (soft delete)
exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const tec = await Tecnico.findById(id);
    if (!tec || tec.isDeleted) return res.status(404).json({ message: 'Técnico no encontrado' });
    tec.isDeleted = true;
    await tec.save();
    res.json({ message: 'Técnico eliminado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar técnico', error: err.message });
  }
};
