const Empresa = require('../../schemas/empresasSchema/empresasSchema');
const Usuario = require('../../schemas/usersSchema/usersSchema');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const ADMIN_ROLE = 1;
const SUPERVISOR_ROLE = 2;

async function getAuthenticatedUser(req) {
  try {
    const token = req?.cookies?.jwt;
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRETO || process.env.JWT_SECRET || '');
    if (!decoded?.id) return null;

    return await Usuario.findById(decoded.id);
  } catch (_error) {
    return null;
  }
}

function canSeeDeletedEmpresas(user) {
  return !!user && (user.rol === ADMIN_ROLE || user.rol === SUPERVISOR_ROLE);
}

function getByPath(source, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], source);
}

function normalizeComparableValue(value) {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value.trim();
  return String(value);
}

function normalizeAuditValue(value) {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if (value?._id) return String(value._id);
    try {
      return JSON.stringify(value);
    } catch (_error) {
      return String(value);
    }
  }
  return String(value);
}

function buildEmpresaSnapshot(empresa) {
  return {
    razonSocial: empresa?.razonSocial,
    sucursal: empresa?.sucursal,
    rfc: empresa?.rfc,
    telefono: empresa?.telefono,
    correo: empresa?.correo,
    status: empresa?.status,
    sector: empresa?.sector ? String(empresa.sector) : null,
    actividadEconomica: empresa?.actividadEconomica ? String(empresa.actividadEconomica) : null,
    direccion: {
      calle: empresa?.direccion?.calle,
      noExterior: empresa?.direccion?.noExterior,
      noInterior: empresa?.direccion?.noInterior,
      colonia: empresa?.direccion?.colonia,
      cp: empresa?.direccion?.cp,
      localidad: empresa?.direccion?.localidad,
      municipio: empresa?.direccion?.municipio,
      estado: empresa?.direccion?.estado,
      latitud: empresa?.direccion?.latitud,
      longitud: empresa?.direccion?.longitud
    },
    notificaciones: {
      calle: empresa?.notificaciones?.calle,
      noExterior: empresa?.notificaciones?.noExterior,
      noInterior: empresa?.notificaciones?.noInterior,
      colonia: empresa?.notificaciones?.colonia,
      cp: empresa?.notificaciones?.cp,
      localidad: empresa?.notificaciones?.localidad,
      municipio: empresa?.notificaciones?.municipio,
      telefono: empresa?.notificaciones?.telefono,
      correo: empresa?.notificaciones?.correo
    },
    representanteLegal: {
      nombre: empresa?.representanteLegal?.nombre,
      correo: empresa?.representanteLegal?.correo,
      telefono: empresa?.representanteLegal?.telefono
    }
  };
}

function buildEmpresaChanges(beforeSnapshot, afterSnapshot) {
  const fields = [
    { path: 'razonSocial', label: 'Razon social' },
    { path: 'sucursal', label: 'Sucursal' },
    { path: 'rfc', label: 'RFC' },
    { path: 'telefono', label: 'Telefono' },
    { path: 'correo', label: 'Correo' },
    { path: 'status', label: 'Estatus' },
    { path: 'sector', label: 'Sector' },
    { path: 'actividadEconomica', label: 'Actividad economica' },
    { path: 'direccion.calle', label: 'Direccion calle' },
    { path: 'direccion.noExterior', label: 'Direccion noExterior' },
    { path: 'direccion.noInterior', label: 'Direccion noInterior' },
    { path: 'direccion.colonia', label: 'Direccion colonia' },
    { path: 'direccion.cp', label: 'Direccion CP' },
    { path: 'direccion.localidad', label: 'Direccion localidad' },
    { path: 'direccion.municipio', label: 'Direccion municipio' },
    { path: 'direccion.estado', label: 'Direccion estado' },
    { path: 'direccion.latitud', label: 'Direccion latitud' },
    { path: 'direccion.longitud', label: 'Direccion longitud' },
    { path: 'notificaciones.calle', label: 'Notificaciones calle' },
    { path: 'notificaciones.noExterior', label: 'Notificaciones noExterior' },
    { path: 'notificaciones.noInterior', label: 'Notificaciones noInterior' },
    { path: 'notificaciones.colonia', label: 'Notificaciones colonia' },
    { path: 'notificaciones.cp', label: 'Notificaciones CP' },
    { path: 'notificaciones.localidad', label: 'Notificaciones localidad' },
    { path: 'notificaciones.municipio', label: 'Notificaciones municipio' },
    { path: 'notificaciones.telefono', label: 'Notificaciones telefono' },
    { path: 'notificaciones.correo', label: 'Notificaciones correo' },
    { path: 'representanteLegal.nombre', label: 'Representante legal nombre' },
    { path: 'representanteLegal.correo', label: 'Representante legal correo' },
    { path: 'representanteLegal.telefono', label: 'Representante legal telefono' }
  ];

  const cambios = [];

  for (const field of fields) {
    const beforeValue = getByPath(beforeSnapshot, field.path);
    const afterValue = getByPath(afterSnapshot, field.path);
    if (normalizeComparableValue(beforeValue) !== normalizeComparableValue(afterValue)) {
      cambios.push({
        campo: field.label,
        antes: normalizeAuditValue(beforeValue),
        despues: normalizeAuditValue(afterValue)
      });
    }
  }

  return cambios;
}

function appendAuditEntry(empresa, { accion, usuario, descripcion, cambios = [] }) {
  if (!Array.isArray(empresa.auditoria)) {
    empresa.auditoria = [];
  }

  empresa.auditoria.push({
    accion,
    fecha: new Date(),
    usuario: usuario?._id || null,
    usuarioNombre: usuario?.name || usuario?.username || 'Sistema',
    descripcion: descripcion || '',
    cambios
  });
}

function emitEmpresaRealtime(req, eventName, empresa) {
  try {
    const io = req.app.get('io');
    if (!io || !empresa) return;

    io.emit(eventName, {
      id: String(empresa._id),
      empresa: {
        _id: String(empresa._id),
        codigo: empresa.codigo || null,
        razonSocial: empresa.razonSocial || null,
        status: empresa.status,
        isDeleted: !!empresa.isDeleted
      }
    });
  } catch (error) {
    console.warn(`WS emit ${eventName} fallo:`, error?.message);
  }
}

// Obtener todas las empresas con paginación y filtros
exports.obtenerEmpresas = async (req, res) => {
  try {
  const { busqueda = '', estado = '', status = '', orden = 'normal' } = req.query;
  const page = parseInt(req.query.page ?? req.query.pagina ?? 1);
  const limit = parseInt(req.query.limit ?? req.query.limite ?? 10);
  const currentUser = await getAuthenticatedUser(req);
  const includeDeleted = canSeeDeletedEmpresas(currentUser);
    
    // Construir filtros
    let filtros = { area: 6 };
    if (!includeDeleted) {
      filtros.isDeleted = false; // Para usuarios no admin/supervisor, ocultar borradas
    }
    
    if (busqueda) {
      filtros.$or = [
        { codigo: { $regex: busqueda, $options: 'i' } },
        { razonSocial: { $regex: busqueda, $options: 'i' } },
        { rfc: { $regex: busqueda, $options: 'i' } },
        { 'direccion.calle': { $regex: busqueda, $options: 'i' } },
        { 'direccion.colonia': { $regex: busqueda, $options: 'i' } },
        { 'direccion.localidad': { $regex: busqueda, $options: 'i' } },
        { 'direccion.municipio': { $regex: busqueda, $options: 'i' } },
        { 'direccion.estado': { $regex: busqueda, $options: 'i' } }
      ];
    }
    
    if (estado) {
      filtros['direccion.estado'] = { $regex: estado, $options: 'i' };
    }
    if (status !== '' && status !== undefined) {
      const st = parseInt(status);
      if (!isNaN(st)) filtros.status = st;
    }
    
    // Aplicar ordenamiento
    let ordenamiento = {};
    switch (orden) {
      case 'reciente':
        ordenamiento = { createdAt: -1 };
        break;
      case 'antiguo':
        ordenamiento = { createdAt: 1 };
        break;
      default:
        ordenamiento = { codigo: 1 };
    }
    
  const skip = (page - 1) * limit;
    
    // Obtener empresas con filtros
    const empresas = await Empresa.find(filtros)
      .populate('lockedBy', 'name username')
      .populate('sector', 'nombre')
      .populate('actividadEconomica', 'nombre')
      .sort(ordenamiento)
      .skip(skip)
  .limit(limit);
    
    // Contar total de empresas que cumplen con los filtros
    const total = await Empresa.countDocuments(filtros);
    
    // Calcular información de paginación
  const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    res.json({
      empresas,
      paginacion: {
        pagina: page,
        paginaActual: page,
        totalPaginas: totalPages,
        totalRegistros: total,
        registrosPorPagina: limit,
        tieneSiguiente: hasNextPage,
        tieneAnterior: hasPrevPage
      },
      meta: {
        incluyeBorradas: includeDeleted
      }
    });
    
  } catch (error) {
    console.error('Error al obtener empresas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener una empresa por ID
exports.obtenerEmpresaPorId = async (req, res) => {
  try {
    console.log(`🔍 Controlador: Obteniendo empresa con ID: ${req.params.id}`);
    const currentUser = await getAuthenticatedUser(req);
    const includeDeleted = canSeeDeletedEmpresas(currentUser);
    
  const empresa = await Empresa.findById(req.params.id).populate('sector').populate('actividadEconomica');
    if (!empresa || (empresa.isDeleted && !includeDeleted)) {
      console.log(`❌ Empresa no encontrada con ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }
    
    console.log(`✅ Controlador: Empresa encontrada: ${empresa.razonSocial}`);
    res.json(empresa);
  } catch (err) {
    console.error('❌ Error al obtener empresa por ID:', err);
    res.status(500).json({ message: 'Error al obtener empresa', error: err.message });
  }
};

// Función para ver empresa (solo lectura)
exports.verEmpresa = async (req, res) => {
  try {
    console.log(`👁️ Controlador: Visualizando empresa con ID: ${req.params.id}`);
    const currentUser = await getAuthenticatedUser(req);
    const includeDeleted = canSeeDeletedEmpresas(currentUser);
    
  const empresa = await Empresa.findById(req.params.id).populate('sector').populate('actividadEconomica');
    if (!empresa || (empresa.isDeleted && !includeDeleted)) {
      console.log(`❌ Empresa no encontrada con ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }
    
    console.log(`✅ Controlador: Empresa visualizada: ${empresa.razonSocial}`);
    res.json(empresa);
  } catch (err) {
    console.error('❌ Error al visualizar empresa:', err);
    res.status(500).json({ message: 'Error al visualizar empresa', error: err.message });
  }
};

// Crear una nueva empresa
exports.crearEmpresa = async (req, res) => {
  try {
    console.log('🔍 Controlador: Creando nueva empresa...');
    console.log('📝 Datos recibidos:', JSON.stringify(req.body, null, 2));
    const currentUser = await getAuthenticatedUser(req);
    
    const {
      razonSocial,
      sucursal,
      rfc,
      direccion,
      telefono,
      correo,
      notificaciones,
      representanteLegal,
      sector,
      actividadEconomica
    } = req.body;

    // Validar campos requeridos
    if (!razonSocial || !rfc || !direccion || !telefono || !correo || !representanteLegal) {
      console.log('❌ Validación fallida: campos requeridos faltantes');
      return res.status(400).json({ 
        message: 'Todos los campos son obligatorios' 
      });
    }

    // Validar estructura de dirección
    if (!direccion.calle || !direccion.colonia || !direccion.cp || 
        !direccion.municipio || !direccion.estado) {
      console.log('❌ Validación fallida: campos de dirección faltantes');
      return res.status(400).json({ 
        message: 'Todos los campos de dirección son obligatorios' 
      });
    }

    // Validar representante legal
    if (!representanteLegal.nombre || !representanteLegal.correo || !representanteLegal.telefono) {
      console.log('❌ Validación fallida: campos del representante legal faltantes');
      return res.status(400).json({ 
        message: 'Todos los campos del representante legal son obligatorios' 
      });
    }

    // Verificar si ya existe una empresa no borrada con el mismo RFC y sucursal
    console.log(`🔍 Verificando duplicado RFC + sucursal: ${rfc} / ${sucursal || '(sin sucursal)'}`);
    const empresaExistente = await Empresa.findOne({ 
      rfc: rfc.toUpperCase(),
      sucursal: sucursal || '',
      isDeleted: false
    });
    if (empresaExistente) {
      console.log(`❌ Duplicado encontrado: RFC ${rfc} con sucursal '${sucursal || ''}'`);
      return res.status(400).json({ 
        message: 'Ya existe una empresa con este RFC y la misma sucursal' 
      });
    }

    // Generar código único
    console.log('🔍 Generando código único...');
    const codigo = await Empresa.generarCodigoUnico();
    console.log(`✅ Código generado: ${codigo}`);

    // Crear la nueva empresa
    const nuevaEmpresa = new Empresa({
      codigo,
      razonSocial,
      sucursal: sucursal || '',
      rfc: rfc.toUpperCase(),
      direccion: {
        calle: direccion.calle,
        noExterior: direccion.noExterior || '',
        noInterior: direccion.noInterior || '',
        colonia: direccion.colonia,
        cp: direccion.cp,
        localidad: direccion.localidad || '',
        municipio: direccion.municipio,
        estado: direccion.estado,
        latitud: direccion.latitud || '',
        longitud: direccion.longitud || ''
      },
      telefono,
      correo: correo.toLowerCase(),
      sector: sector || undefined,
      actividadEconomica: actividadEconomica || undefined,
              notificaciones: {
          calle: notificaciones?.calle || '',
          noExterior: notificaciones?.noExterior || '',
          noInterior: notificaciones?.noInterior || '',
          colonia: notificaciones?.colonia || '',
          cp: notificaciones?.cp || '',
          localidad: notificaciones?.localidad || '',
          municipio: notificaciones?.municipio || '',
          telefono: notificaciones?.telefono || '',
          correo: notificaciones?.correo ? notificaciones.correo.toLowerCase() : ''
        },
      representanteLegal: {
        nombre: representanteLegal.nombre,
        correo: representanteLegal.correo.toLowerCase(),
        telefono: representanteLegal.telefono
      },
      area: 6 // Área de gestión ambiental
    });

    appendAuditEntry(nuevaEmpresa, {
      accion: 'CREACION',
      usuario: currentUser,
      descripcion: 'Empresa creada',
      cambios: [
        {
          campo: 'Registro',
          antes: null,
          despues: 'Creado'
        }
      ]
    });

    console.log('💾 Guardando empresa en la base de datos...');
    await nuevaEmpresa.save();
    console.log(`✅ Empresa guardada exitosamente con ID: ${nuevaEmpresa._id}`);

    emitEmpresaRealtime(req, 'empresa:create', nuevaEmpresa);

    res.status(201).json({ 
      message: 'Empresa creada correctamente',
      empresa: nuevaEmpresa
    });

  } catch (err) {
    console.error('❌ Error al crear empresa:', err);
    res.status(500).json({ message: 'Error al crear empresa', error: err.message });
  }
};

// Actualizar una empresa existente
exports.actualizarEmpresa = async (req, res) => {
  try {
    console.log(`🔍 Controlador: Actualizando empresa con ID: ${req.params.id}`);
    console.log('📝 Datos de actualización:', JSON.stringify(req.body, null, 2));
    const currentUser = await getAuthenticatedUser(req);
    const includeDeleted = canSeeDeletedEmpresas(currentUser);
    
    const {
      razonSocial,
      sucursal,
      rfc,
      direccion,
      telefono,
      correo,
      notificaciones,
      representanteLegal,
      status,
      sector,
      actividadEconomica
    } = req.body;

    const empresa = await Empresa.findById(req.params.id);
    if (!empresa || (empresa.isDeleted && !includeDeleted)) {
      console.log(`❌ Empresa no encontrada con ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    const snapshotBefore = buildEmpresaSnapshot(empresa);

    // Verificar si ya existe otra empresa no borrada con el mismo RFC y sucursal
    const nuevoRfc = rfc ? rfc.toUpperCase() : empresa.rfc;
    const nuevaSucursal = sucursal !== undefined ? sucursal : empresa.sucursal;
    if (nuevoRfc !== empresa.rfc || nuevaSucursal !== empresa.sucursal) {
      console.log(`🔍 Verificando duplicado RFC + sucursal: ${nuevoRfc} / ${nuevaSucursal || '(sin sucursal)'}`);
      const empresaExistente = await Empresa.findOne({ 
        rfc: nuevoRfc,
        sucursal: nuevaSucursal || '',
        _id: { $ne: req.params.id },
        isDeleted: false
      });
      if (empresaExistente) {
        console.log(`❌ Duplicado encontrado: RFC ${nuevoRfc} con sucursal '${nuevaSucursal || ''}'`);
        return res.status(400).json({ 
          message: 'Ya existe otra empresa con este RFC y la misma sucursal' 
        });
      }
    }

    // Actualizar campos
    if (razonSocial) empresa.razonSocial = razonSocial;
    if (sucursal !== undefined) empresa.sucursal = sucursal;
    if (rfc) empresa.rfc = rfc.toUpperCase();
    if (telefono) empresa.telefono = telefono;
    if (correo) empresa.correo = correo.toLowerCase();
    if (typeof status !== 'undefined') empresa.status = status;
  if (typeof sector !== 'undefined') empresa.sector = sector || undefined;
  if (typeof actividadEconomica !== 'undefined') empresa.actividadEconomica = actividadEconomica || undefined;

    // Actualizar dirección si se proporciona
    if (direccion) {
      if (direccion.calle) empresa.direccion.calle = direccion.calle;
      if (direccion.noExterior !== undefined) empresa.direccion.noExterior = direccion.noExterior;
      if (direccion.noInterior !== undefined) empresa.direccion.noInterior = direccion.noInterior;
      if (direccion.colonia) empresa.direccion.colonia = direccion.colonia;
      if (direccion.cp) empresa.direccion.cp = direccion.cp;
      if (direccion.localidad !== undefined) empresa.direccion.localidad = direccion.localidad;
      if (direccion.municipio) empresa.direccion.municipio = direccion.municipio;
      if (direccion.estado) empresa.direccion.estado = direccion.estado;
      if (direccion.latitud !== undefined) empresa.direccion.latitud = direccion.latitud;
      if (direccion.longitud !== undefined) empresa.direccion.longitud = direccion.longitud;
    }

    // Actualizar notificaciones si se proporciona
            if (notificaciones) {
          if (notificaciones.calle !== undefined) empresa.notificaciones.calle = notificaciones.calle;
          if (notificaciones.noExterior !== undefined) empresa.notificaciones.noExterior = notificaciones.noExterior;
          if (notificaciones.noInterior !== undefined) empresa.notificaciones.noInterior = notificaciones.noInterior;
          if (notificaciones.colonia !== undefined) empresa.notificaciones.colonia = notificaciones.colonia;
          if (notificaciones.cp !== undefined) empresa.notificaciones.cp = notificaciones.cp;
          if (notificaciones.localidad !== undefined) empresa.notificaciones.localidad = notificaciones.localidad;
          if (notificaciones.municipio !== undefined) empresa.notificaciones.municipio = notificaciones.municipio;
          if (notificaciones.telefono !== undefined) empresa.notificaciones.telefono = notificaciones.telefono;
          if (notificaciones.correo !== undefined) empresa.notificaciones.correo = notificaciones.correo ? notificaciones.correo.toLowerCase() : '';
        }

    // Actualizar representante legal si se proporciona
    if (representanteLegal) {
      if (representanteLegal.nombre) empresa.representanteLegal.nombre = representanteLegal.nombre;
      if (representanteLegal.correo) empresa.representanteLegal.correo = representanteLegal.correo.toLowerCase();
      if (representanteLegal.telefono) empresa.representanteLegal.telefono = representanteLegal.telefono;
    }

    const snapshotAfter = buildEmpresaSnapshot(empresa);
    const cambios = buildEmpresaChanges(snapshotBefore, snapshotAfter);
    if (cambios.length) {
      appendAuditEntry(empresa, {
        accion: 'ACTUALIZACION',
        usuario: currentUser,
        descripcion: 'Actualizacion de empresa',
        cambios
      });
    }

    console.log('💾 Guardando cambios en la base de datos...');
    await empresa.save();
    console.log(`✅ Empresa actualizada exitosamente: ${empresa.razonSocial}`);

    emitEmpresaRealtime(req, 'empresa:update', empresa);

    res.json({ 
      message: 'Empresa actualizada correctamente',
      empresa
    });

  } catch (err) {
    console.error('❌ Error al actualizar empresa:', err);
    res.status(500).json({ message: 'Error al actualizar empresa', error: err.message });
  }
};

// "Eliminar" empresa (marcar como borrada)
exports.eliminarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = await getAuthenticatedUser(req);
    const includeDeleted = canSeeDeletedEmpresas(currentUser);
    
    // Verificar que la empresa existe
    const empresa = await Empresa.findById(id);
    if (!empresa || (empresa.isDeleted && !includeDeleted)) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    if (empresa.isDeleted) {
      return res.json({ message: 'La empresa ya estaba marcada como borrada' });
    }
    
    // Marcar como borrada (soft delete)
    empresa.isDeleted = true;
    appendAuditEntry(empresa, {
      accion: 'BORRADO_LOGICO',
      usuario: currentUser,
      descripcion: 'Borrado logico de empresa',
      cambios: [
        {
          campo: 'Registro',
          antes: 'Visible',
          despues: 'Borrado'
        }
      ]
    });
    await empresa.save();

    emitEmpresaRealtime(req, 'empresa:delete', empresa);
    
    res.json({ message: 'Empresa eliminada exitosamente' });
    
  } catch (error) {
    console.error('Error al eliminar empresa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Restaurar empresa borrada lógicamente
exports.restaurarEmpresa = async (req, res) => {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!canSeeDeletedEmpresas(currentUser)) {
      return res.status(403).json({ message: 'Solo Administrador o Supervisor pueden restaurar empresas' });
    }

    const { id } = req.params;
    const empresa = await Empresa.findById(id);

    if (!empresa) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    if (!empresa.isDeleted) {
      return res.json({ message: 'La empresa ya esta activa', empresa });
    }

    // Mantener la regla actual: no permitir dos RFC activos iguales
    const duplicadaActiva = await Empresa.findOne({
      rfc: empresa.rfc,
      isDeleted: false,
      _id: { $ne: empresa._id }
    });

    if (duplicadaActiva) {
      return res.status(409).json({
        message: 'No se puede restaurar porque ya existe una empresa activa con el mismo RFC'
      });
    }

    empresa.isDeleted = false;
    appendAuditEntry(empresa, {
      accion: 'RESTAURACION',
      usuario: currentUser,
      descripcion: 'Restauracion de empresa',
      cambios: [
        {
          campo: 'Registro',
          antes: 'Borrado',
          despues: 'Visible'
        }
      ]
    });

    await empresa.save();

    emitEmpresaRealtime(req, 'empresa:restore', empresa);

    return res.json({
      message: 'Empresa restaurada correctamente',
      empresa
    });
  } catch (error) {
    console.error('Error al restaurar empresa:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Buscar empresas por criterio
exports.buscarEmpresas = async (req, res) => {
  try {
  const { criterio, q } = req.query;
  const term = (criterio ?? q ?? '').trim();
  const currentUser = await getAuthenticatedUser(req);
  const includeDeleted = canSeeDeletedEmpresas(currentUser);

  if (!term) {
      return res.status(400).json({ message: 'Criterio de búsqueda requerido' });
    }
    
    const filtrosBusqueda = {
      area: 6,
      $or: [
        { codigo: { $regex: term, $options: 'i' } },
        { razonSocial: { $regex: term, $options: 'i' } },
        { rfc: { $regex: term, $options: 'i' } },
        { 'direccion.estado': { $regex: term, $options: 'i' } }
      ]
    };

    if (!includeDeleted) {
      filtrosBusqueda.isDeleted = false;
    }

    const empresas = await Empresa.find(filtrosBusqueda).sort({ createdAt: -1 });
    
    res.json(empresas);
    
  } catch (error) {
    console.error('Error al buscar empresas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener estadísticas de empresas
exports.obtenerEstadisticas = async (req, res) => {
  try {
    // Solo contar empresas no borradas
    const totalEmpresas = await Empresa.countDocuments({ isDeleted: false });
    const empresasActivas = await Empresa.countDocuments({ isDeleted: false, status: 1 });
    const empresasInactivas = await Empresa.countDocuments({ isDeleted: false, status: 0 });
    
    res.json({
      totalEmpresas,
      empresasActivas,
      empresasInactivas
    });
    
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener historial de auditoría de una empresa
exports.obtenerAuditoriaEmpresa = async (req, res) => {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!canSeeDeletedEmpresas(currentUser)) {
      return res.status(403).json({ message: 'Solo Administrador o Supervisor pueden ver auditoria' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    const pageRaw = Number(req.query.page ?? req.query.pagina ?? 1);
    const page = Math.max(Number.isFinite(pageRaw) ? Math.trunc(pageRaw) : 1, 1);

    const limitRaw = Number(req.query.limit ?? req.query.limite ?? 5);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? Math.trunc(limitRaw) : 5, 1), 100);

    const skip = (page - 1) * limit;

    const [empresa] = await Empresa.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.params.id)
        }
      },
      {
        $project: {
          razonSocial: 1,
          totalRegistros: {
            $size: {
              $ifNull: ['$auditoria', []]
            }
          },
          auditoriaPagina: {
            $slice: [
              {
                $reverseArray: {
                  $ifNull: ['$auditoria', []]
                }
              },
              skip,
              limit
            ]
          }
        }
      }
    ]);

    if (!empresa) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    const auditoriaPagina = Array.isArray(empresa.auditoriaPagina) ? empresa.auditoriaPagina : [];
    const totalRegistrosRaw = Number(empresa.totalRegistros ?? 0);
    const totalRegistros = Number.isFinite(totalRegistrosRaw) ? totalRegistrosRaw : 0;
    const totalPaginas = Math.max(Math.ceil(totalRegistros / limit), 1);
    const tieneSiguiente = page < totalPaginas;
    const tieneAnterior = page > 1;

    const userIds = [...new Set(
      auditoriaPagina
        .map((evento) => evento?.usuario ? String(evento.usuario) : null)
        .filter(Boolean)
    )];

    const users = userIds.length
      ? await Usuario.find({ _id: { $in: userIds } }).select('name username').lean()
      : [];

    const userMap = new Map(users.map((user) => [String(user._id), user.name || user.username || 'Sistema']));

    const historial = [...auditoriaPagina]
      .map((evento) => ({
        _id: evento._id,
        accion: evento.accion,
        fecha: evento.fecha,
        usuario: evento.usuario || null,
        usuarioNombre: evento.usuarioNombre || (evento.usuario ? userMap.get(String(evento.usuario)) : null) || 'Sistema',
        descripcion: evento.descripcion || '',
        cambios: evento.cambios || []
      }));

    return res.json({
      empresaId: empresa._id,
      empresaNombre: empresa.razonSocial,
      historial,
      paginacion: {
        pagina: page,
        totalPaginas,
        totalRegistros,
        registrosPorPagina: limit,
        tieneSiguiente,
        tieneAnterior
      }
    });
  } catch (error) {
    console.error('Error al obtener auditoria de empresa:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// TTL para bloqueos (1 minuto)
const LOCK_TTL_MS = 1 * 60 * 1000;

// Bloquear una empresa para edición
exports.bloquearEmpresa = async (req, res) => {
  try {
    const usuario = await getAuthenticatedUser(req);
    if (!usuario) {
      return res.status(401).json({ message: 'Sesion no valida. Inicia sesion nuevamente.' });
    }

    const empresa = await Empresa.findById(req.params.id);
    if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });

    // Si está bloqueada por otro, verificar si expiró el TTL
    if (empresa.lockedBy && String(empresa.lockedBy) !== String(usuario._id)) {
      const expiro = empresa.lockedAt && (Date.now() - new Date(empresa.lockedAt).getTime() > LOCK_TTL_MS);
      if (!expiro) {
        return res.status(423).json({ message: 'Actualmente está siendo editada por otra persona' });
      }
    }

    empresa.lockedBy = usuario._id;
    empresa.lockedAt = new Date();
    await empresa.save();

    try {
      const io = req.app.get('io');
      io && io.emit('empresa:lock', { 
        id: String(empresa._id), 
        user: { 
          _id: usuario._id, 
          name: usuario.name, 
          username: usuario.username 
        } 
      });
    } catch (e) {
      console.warn('WS emit lock fallo:', e?.message);
    }

    res.json({ message: 'Empresa bloqueada', id: String(empresa._id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al bloquear la empresa' });
  }
};

// Desbloquear una empresa
exports.desbloquearEmpresa = async (req, res) => {
  try {
    const usuario = await getAuthenticatedUser(req);
    if (!usuario) {
      return res.status(401).json({ message: 'Sesion no valida. Inicia sesion nuevamente.' });
    }

    const empresa = await Empresa.findById(req.params.id);
    if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });

    // Solo quien lo bloqueó puede liberarlo
    if (empresa.lockedBy && String(empresa.lockedBy) !== String(usuario._id)) {
      return res.status(423).json({ message: 'No puedes liberar un bloqueo de otro usuario' });
    }

    empresa.lockedBy = null;
    empresa.lockedAt = null;
    await empresa.save();

    try {
      const io = req.app.get('io');
      io && io.emit('empresa:unlock', { id: String(empresa._id) });
    } catch (e) {
      console.warn('WS emit unlock fallo:', e?.message);
    }

    res.json({ message: 'Empresa desbloqueada', id: String(empresa._id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al desbloquear la empresa' });
  }
};
