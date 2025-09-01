const Tramite = require('../../schemas/empresasSchema/tramitesSchema');
const mongoose = require('mongoose');
const Empresa = require('../../schemas/empresasSchema/empresasSchema');
const Usuario = require('../../schemas/usersSchema/usersSchema');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './env/.env' });
const JWT_SECRET = process.env.JWT_SECRETO;
const LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutos

// Utilidades de resolución de empresa
const escapeRegex = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizarCodigo = (str = '') => String(str).split(' - ')[0].trim().toUpperCase();
async function resolverEmpresa(entrada) {
  if (!entrada) return null;
  // Intentar como ObjectId válido
  if (mongoose.isValidObjectId && mongoose.isValidObjectId(entrada)) {
    const emp = await Empresa.findById(entrada);
    if (emp) return emp;
  }
  // Intentar por código (soporta "CODIGO - NOMBRE" y case-insensitive)
  const code = normalizarCodigo(entrada);
  let emp = await Empresa.findOne({ codigo: code });
  if (emp) return emp;
  emp = await Empresa.findOne({ codigo: new RegExp(`^${escapeRegex(code)}$`, 'i') });
  return emp;
}

// Obtener todos los trámites
exports.obtenerTramites = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);

    if (!usuario || (usuario.rol !== 1 && usuario.area !== 6)) {
      return res.status(403).json({ message: 'Acceso denegado. Área no autorizada.' });
    }

    const { page = 1, limit = 20, search, status, tipoTramite, empresa } = req.query;
    const skip = (page - 1) * limit;

    let filtros = { isDeleted: false };

    // Aplicar filtros si se proporcionan
    if (search) {
      filtros.$or = [
        { folioOficialia: { $regex: search, $options: 'i' } },
        { observaciones: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) filtros.status = status;
    if (tipoTramite) filtros.tipoTramite = tipoTramite;
    if (empresa) filtros.empresa = empresa;

    const tramites = await Tramite.find(filtros)
      .populate('empresa', 'codigo razonSocial')
      .populate('lockedBy', 'name username')
      .sort({ fechaEntrada: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Tramite.countDocuments(filtros);

    res.json({
      tramites,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener trámites' });
  }
};

// Obtener un trámite por ID
exports.obtenerTramitePorId = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);

    if (!usuario || (usuario.rol !== 1 && usuario.area !== 6)) {
      return res.status(403).json({ message: 'Acceso denegado. Área no autorizada.' });
    }

    const tramite = await Tramite.findById(req.params.id)
      .populate('empresa', 'codigo razonSocial direccion telefono correo representanteLegal')
      .populate('lockedBy', 'name username');

    if (!tramite) {
      return res.status(404).json({ message: 'Trámite no encontrado' });
    }

    res.json(tramite);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener el trámite' });
  }
};

// Crear un nuevo trámite
exports.crearTramite = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);

    if (!usuario || (usuario.rol !== 1 && usuario.area !== 6)) {
      return res.status(403).json({ message: 'Acceso denegado. Área no autorizada.' });
    }

    const {
      folioOficialia,
      empresa,
      fechaEntrada,
      tipoTramite,
      asuntoEspecifico,
      observaciones,
      status,
      tecnicos,
      numeroPaginas,
      tiempoEstimadoSalida
    } = req.body;

    // Validar campos obligatorios
    if (!folioOficialia || !empresa || !tipoTramite || !asuntoEspecifico) {
      return res.status(400).json({ 
        message: 'Folio, empresa, tipo de trámite y asunto específico son obligatorios' 
      });
    }

  // Resolución de empresa: aceptar ID o código (case-insensitive y soporta "CODIGO - NOMBRE")
  const empresaExiste = await resolverEmpresa(empresa);
    if (!empresaExiste) {
      return res.status(400).json({ message: 'La empresa especificada no existe' });
    }

    // Validar técnicos como números predefinidos
    if (tecnicos && tecnicos.length > 0) {
      const validos = new Set([1,2,3,4,5,6,7,8,9,10,11,12]);
      const invalidos = tecnicos.filter(t => typeof t !== 'number' || !validos.has(t));
      if (invalidos.length) {
        return res.status(400).json({ message: `Técnicos inválidos: ${invalidos.join(', ')}` });
      }
    }

    // El folio debe ser proporcionado por el usuario
    const folioFinal = folioOficialia;

    const nuevoTramite = new Tramite({
      folioOficialia: folioFinal,
      empresa: empresaExiste._id,
      fechaEntrada: fechaEntrada || new Date(),
      tipoTramite,
      asuntoEspecifico,
      observaciones,
      status: status || 'Ingresado al area',
      tecnicos: tecnicos || [],
      numeroPaginas,
      tiempoEstimadoSalida
    });

    await nuevoTramite.save();

    // Populate antes de enviar respuesta
  await nuevoTramite.populate('empresa', 'codigo razonSocial');

    // Emitir evento en tiempo real
    try {
      const io = req.app.get('io');
      io && io.emit('tramite:create', { tramite: nuevoTramite });
    } catch (e) {
      // No bloquear la respuesta por errores de socket
      console.warn('WS emit create fallo:', e?.message);
    }

    res.status(201).json({
      message: 'Trámite creado correctamente',
      tramite: nuevoTramite
    });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'El folio de oficialía ya existe' });
    }
    res.status(500).json({ message: 'Error al crear el trámite' });
  }
};

// Actualizar un trámite existente
exports.actualizarTramite = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);

    if (!usuario || (usuario.rol !== 1 && usuario.area !== 6)) {
      return res.status(403).json({ message: 'Acceso denegado. Área no autorizada.' });
    }

    const tramite = await Tramite.findById(req.params.id);
    if (!tramite) {
      return res.status(404).json({ message: 'Trámite no encontrado' });
    }

    // Enforce lock con TTL: si está bloqueado por otro y no expiró, rechazar
    if (tramite.lockedBy && String(tramite.lockedBy) !== String(usuario._id)) {
      const expiro = tramite.lockedAt && (Date.now() - new Date(tramite.lockedAt).getTime() > LOCK_TTL_MS);
      if (!expiro) {
        return res.status(423).json({ message: 'El trámite está siendo editado por otro usuario' });
      }
    }

    const {
      folioOficialia,
      empresa,
      fechaEntrada,
      tipoTramite,
      asuntoEspecifico,
      observaciones,
      status,
      tecnicos,
      numeroPaginas,
      tiempoEstimadoSalida
    } = req.body;

    // Verificar que la empresa existe si se va a actualizar (acepta ID o código)
    if (empresa) {
      const empresaExiste = await resolverEmpresa(empresa);
      if (!empresaExiste) {
        return res.status(400).json({ message: 'La empresa especificada no existe' });
      }
      tramite.empresa = empresaExiste._id;
    }

    // Validar técnicos como números predefinidos en actualización
    if (tecnicos && tecnicos.length > 0) {
      const validos = new Set([1,2,3,4,5,6,7,8,9,10,11,12]);
      const invalidos = tecnicos.filter(t => typeof t !== 'number' || !validos.has(t));
      if (invalidos.length) {
        return res.status(400).json({ message: `Técnicos inválidos: ${invalidos.join(', ')}` });
      }
      tramite.tecnicos = tecnicos;
    }

    // Actualizar campos si se proporcionan
    if (folioOficialia) tramite.folioOficialia = folioOficialia;
    if (fechaEntrada) tramite.fechaEntrada = fechaEntrada;
    if (tipoTramite) tramite.tipoTramite = tipoTramite;
    if (asuntoEspecifico) tramite.asuntoEspecifico = asuntoEspecifico;
    if (observaciones !== undefined) tramite.observaciones = observaciones;
    if (status) tramite.status = status;
    if (numeroPaginas !== undefined) tramite.numeroPaginas = numeroPaginas;
    if (tiempoEstimadoSalida !== undefined) tramite.tiempoEstimadoSalida = tiempoEstimadoSalida;

    // Al guardar actualización, liberar el bloqueo si era del usuario
    if (tramite.lockedBy && String(tramite.lockedBy) === String(usuario._id)) {
      tramite.lockedBy = null;
      tramite.lockedAt = null;
    }
    await tramite.save();

    // Populate antes de enviar respuesta
  await tramite.populate('empresa', 'codigo razonSocial');
  await tramite.populate('lockedBy', 'name username');

    // Emitir evento en tiempo real
    try {
      const io = req.app.get('io');
      io && io.emit('tramite:update', { tramite });
    } catch (e) {
      console.warn('WS emit update fallo:', e?.message);
    }

    // Emitir unlock si quedó liberado
    try {
      if (!tramite.lockedBy) {
        const io = req.app.get('io');
        io && io.emit('tramite:unlock', { id: String(tramite._id) });
      }
    } catch (e) {
      console.warn('WS emit unlock post-update fallo:', e?.message);
    }

    res.json({
      message: 'Trámite actualizado correctamente',
      tramite
    });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'El folio de oficialía ya existe' });
    }
    res.status(500).json({ message: 'Error al actualizar el trámite' });
  }
};

// Eliminar un trámite (soft delete)
exports.eliminarTramite = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);

    if (!usuario || (usuario.rol !== 1 && usuario.area !== 6)) {
      return res.status(403).json({ message: 'Acceso denegado. Área no autorizada.' });
    }

    const tramite = await Tramite.findById(req.params.id);
    if (!tramite) {
      return res.status(404).json({ message: 'Trámite no encontrado' });
    }

    tramite.isDeleted = true;
    await tramite.save();

    // Emitir evento en tiempo real
    try {
      const io = req.app.get('io');
      io && io.emit('tramite:delete', { id: String(tramite._id) });
    } catch (e) {
      console.warn('WS emit delete fallo:', e?.message);
    }

    res.json({ message: 'Trámite eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar el trámite' });
  }
};

// Obtener trámites por empresa
exports.obtenerTramitesPorEmpresa = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);

    if (!usuario || (usuario.rol !== 1 && usuario.area !== 6)) {
      return res.status(403).json({ message: 'Acceso denegado. Área no autorizada.' });
    }

    const { empresaId } = req.params;
    const tramites = await Tramite.obtenerPorEmpresa(empresaId);

    res.json(tramites);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener trámites de la empresa' });
  }
};

// Obtener trámites por status
exports.obtenerTramitesPorStatus = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);

    if (!usuario || (usuario.rol !== 1 && usuario.area !== 6)) {
      return res.status(403).json({ message: 'Acceso denegado. Área no autorizada.' });
    }

    const { status } = req.params;
    const tramites = await Tramite.obtenerPorStatus(status);

    res.json(tramites);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener trámites por status' });
  }
};

// Buscar trámites
exports.buscarTramites = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);

    if (!usuario || (usuario.rol !== 1 && usuario.area !== 6)) {
      return res.status(403).json({ message: 'Acceso denegado. Área no autorizada.' });
    }

    const { criterio } = req.query;
    if (!criterio) {
      return res.status(400).json({ message: 'Criterio de búsqueda requerido' });
    }

    const tramites = await Tramite.buscarTramites(criterio);
    res.json(tramites);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al buscar trámites' });
  }
};

// Obtener estadísticas
exports.obtenerEstadisticas = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);

    if (!usuario || (usuario.rol !== 1 && usuario.area !== 6)) {
      return res.status(403).json({ message: 'Acceso denegado. Área no autorizada.' });
    }

    const { mes, anio } = req.query;
    const mesActual = mes || new Date().toLocaleString('es-MX', { month: 'long' });
    const anioActual = anio || new Date().getFullYear();

    const estadisticas = await Tramite.obtenerEstadisticas(mesActual, anioActual);

    // Obtener total de trámites del mes
    const totalTramites = await Tramite.countDocuments({
      mesCapturado: mesActual,
      anioCapturado: anioActual,
      isDeleted: false
    });

    res.json({
      mes: mesActual,
      anio: anioActual,
      totalTramites,
      estadisticas
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
};

// Bloquear un trámite para edición
exports.bloquearTramite = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);
    if (!usuario || (usuario.rol !== 1 && usuario.area !== 6)) {
      return res.status(403).json({ message: 'Acceso denegado. Área no autorizada.' });
    }

    const tramite = await Tramite.findById(req.params.id);
    if (!tramite) return res.status(404).json({ message: 'Trámite no encontrado' });

    // Si está bloqueado por otro, permitir toma si expiró TTL; si no, rechazar
    if (tramite.lockedBy && String(tramite.lockedBy) !== String(usuario._id)) {
      const expiro = tramite.lockedAt && (Date.now() - new Date(tramite.lockedAt).getTime() > LOCK_TTL_MS);
      if (!expiro) {
        return res.status(423).json({ message: 'Actualmente está siendo editado por otra persona' });
      }
    }

    tramite.lockedBy = usuario._id;
    tramite.lockedAt = new Date();
    await tramite.save();

    try {
      const io = req.app.get('io');
      io && io.emit('tramite:lock', { id: String(tramite._id), user: { _id: usuario._id, name: usuario.name, username: usuario.username } });
    } catch (e) {
      console.warn('WS emit lock fallo:', e?.message);
    }

    res.json({ message: 'Trámite bloqueado', id: String(tramite._id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al bloquear el trámite' });
  }
};

// Desbloquear un trámite
exports.desbloquearTramite = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);
    if (!usuario || (usuario.rol !== 1 && usuario.area !== 6)) {
      return res.status(403).json({ message: 'Acceso denegado. Área no autorizada.' });
    }

    const tramite = await Tramite.findById(req.params.id);
    if (!tramite) return res.status(404).json({ message: 'Trámite no encontrado' });

    // Solo quien lo bloqueó puede liberarlo
    if (tramite.lockedBy && String(tramite.lockedBy) !== String(usuario._id)) {
      return res.status(423).json({ message: 'No puedes liberar un bloqueo de otro usuario' });
    }

    tramite.lockedBy = null;
    tramite.lockedAt = null;
    await tramite.save();

    try {
      const io = req.app.get('io');
      io && io.emit('tramite:unlock', { id: String(tramite._id) });
    } catch (e) {
      console.warn('WS emit unlock fallo:', e?.message);
    }

    res.json({ message: 'Trámite desbloqueado', id: String(tramite._id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al desbloquear el trámite' });
  }
};

// Obtener opciones para filtros
exports.obtenerOpcionesFiltros = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);

    if (!usuario || (usuario.rol !== 1 && usuario.area !== 6)) {
      return res.status(403).json({ message: 'Acceso denegado. Área no autorizada.' });
    }

    // Obtener empresas activas
    const empresas = await Empresa.find({ status: 1, isDeleted: false, area: 6 })
      .select('codigo razonSocial')
      .sort({ razonSocial: 1 });

    // Obtener técnicos del área
    const tecnicos = await Usuario.find({ area: 6, status: 1, isDeleted: false })
      .select('name username')
      .sort({ name: 1 });

    res.json({
      empresas,
      tecnicos,
      tiposTramite: [
        'GRME', 'PM', 'AARME', 'TRME', 'LAF', 'CEOA',
        'Informacion Comp. GRME', 'Informacion Comp. PM', 'Informacion Comp. AARME',
        'Informacion Comp. LAF', 'Respuesta General', 'Opinion Tecnica GRME',
        'Opinion Tecnica PM', 'Opinion Tecnica TRME', 'Opinion Tecnica AARME',
        'Opinion Tecnica LAF', 'Opinion Tecnica CEOA', 'Copias Certificadas',
        'Condicionantes y/o Terminos', 'Inf Adicional', 'Denuncias', 'Bajas',
        'Avisos', 'Otros', 'Alcance'
      ],
      asuntosEspecificos: [
        'Solicitud de registro',
        'Seguimiento',
        'Autorizacion'
      ],
      status: [
        'Ingresado al area',
        'Turnado con tecnico evaluador',
        'Proceso de firma con jefe de departamento',
        'Turnado a direccion',
        'Resguardo para notificar',
        'Notificado'
      ]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener opciones de filtros' });
  }
};
