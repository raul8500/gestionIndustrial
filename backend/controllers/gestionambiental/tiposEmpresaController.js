const TipoEmpresa = require('../../schemas/empresasSchema/tiposEmpresaSchema');

// Listar tipos (solo activos si ?soloActivos=1)
exports.listarTipos = async (req, res) => {
  try {
    const { soloActivos } = req.query;
    const filtro = { area: 6, isDeleted: false };
    if (soloActivos === '1') filtro.status = 1;
    const tipos = await TipoEmpresa.find(filtro).sort({ nombre: 1 });
    res.json(tipos);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener tipos', error: err.message });
  }
};

// Crear tipo
exports.crearTipo = async (req, res) => {
  try {
    const { nombre, status } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ message: 'El nombre es obligatorio' });
    const existe = await TipoEmpresa.findOne({ nombre: nombre.trim(), isDeleted: false });
    if (existe) return res.status(400).json({ message: 'Ya existe un tipo con ese nombre' });
    const tipo = new TipoEmpresa({ nombre: nombre.trim(), status: typeof status === 'number' ? status : 1, area: 6 });
    await tipo.save();
    res.status(201).json({ message: 'Tipo creado', tipo });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear tipo', error: err.message });
  }
};

// Actualizar tipo
exports.actualizarTipo = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, status } = req.body;
    const tipo = await TipoEmpresa.findById(id);
    if (!tipo || tipo.isDeleted) return res.status(404).json({ message: 'Tipo no encontrado' });
    if (typeof nombre === 'string' && nombre.trim()) tipo.nombre = nombre.trim();
    if (typeof status !== 'undefined') tipo.status = status;
    await tipo.save();
    res.json({ message: 'Tipo actualizado', tipo });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar tipo', error: err.message });
  }
};

// Eliminar (soft delete)
exports.eliminarTipo = async (req, res) => {
  try {
    const { id } = req.params;
    const tipo = await TipoEmpresa.findById(id);
    if (!tipo || tipo.isDeleted) return res.status(404).json({ message: 'Tipo no encontrado' });
    tipo.isDeleted = true;
    await tipo.save();
    res.json({ message: 'Tipo eliminado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar tipo', error: err.message });
  }
};
