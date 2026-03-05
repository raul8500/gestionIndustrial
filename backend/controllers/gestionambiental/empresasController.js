const Empresa = require('../../schemas/empresasSchema/empresasSchema');
const Usuario = require('../../schemas/usersSchema/usersSchema');

// Obtener todas las empresas con paginación y filtros
exports.obtenerEmpresas = async (req, res) => {
  try {
  const { busqueda = '', estado = '', status = '', orden = 'normal' } = req.query;
  const page = parseInt(req.query.page ?? req.query.pagina ?? 1);
  const limit = parseInt(req.query.limit ?? req.query.limite ?? 10);
    
    // Construir filtros
    let filtros = { 
      isDeleted: false, // Solo empresas no borradas
      area: 6 // Solo empresas de Gestión Ambiental
    };
    
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
    
  const empresa = await Empresa.findById(req.params.id).populate('sector').populate('actividadEconomica');
    if (!empresa) {
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
    
  const empresa = await Empresa.findById(req.params.id).populate('sector').populate('actividadEconomica');
    if (!empresa) {
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

    // Verificar si ya existe una empresa no borrada con el mismo RFC
    console.log(`🔍 Verificando RFC duplicado: ${rfc}`);
    const empresaExistente = await Empresa.findOne({ 
      rfc: rfc.toUpperCase(), 
      isDeleted: false // Solo verificar empresas no borradas
    });
    if (empresaExistente) {
      console.log(`❌ RFC duplicado encontrado en empresa existente: ${rfc}`);
      return res.status(400).json({ 
        message: 'Ya existe una empresa con este RFC' 
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

    console.log('💾 Guardando empresa en la base de datos...');
    await nuevaEmpresa.save();
    console.log(`✅ Empresa guardada exitosamente con ID: ${nuevaEmpresa._id}`);

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
    if (!empresa) {
      console.log(`❌ Empresa no encontrada con ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    // Verificar si el RFC ya existe en otra empresa no borrada
    if (rfc && rfc.toUpperCase() !== empresa.rfc) {
      console.log(`🔍 Verificando RFC duplicado: ${rfc}`);
      const empresaExistente = await Empresa.findOne({ 
        rfc: rfc.toUpperCase(),
        _id: { $ne: req.params.id },
        isDeleted: false // Solo verificar empresas no borradas
      });
      if (empresaExistente) {
        console.log(`❌ RFC duplicado encontrado en empresa existente: ${rfc}`);
        return res.status(400).json({ 
          message: 'Ya existe otra empresa con este RFC' 
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

    console.log('💾 Guardando cambios en la base de datos...');
    await empresa.save();
    console.log(`✅ Empresa actualizada exitosamente: ${empresa.razonSocial}`);

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
    
    // Verificar que la empresa existe
    const empresa = await Empresa.findById(id);
    if (!empresa) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }
    
    // Marcar como borrada (soft delete)
    empresa.isDeleted = true;
    await empresa.save();
    
    res.json({ message: 'Empresa eliminada exitosamente' });
    
  } catch (error) {
    console.error('Error al eliminar empresa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Buscar empresas por criterio
exports.buscarEmpresas = async (req, res) => {
  try {
  const { criterio, q } = req.query;
  const term = (criterio ?? q ?? '').trim();

  if (!term) {
      return res.status(400).json({ message: 'Criterio de búsqueda requerido' });
    }
    
    const empresas = await Empresa.find({
      $and: [
        { isDeleted: false }, // Solo empresas no borradas
        {
          $or: [
      { codigo: { $regex: term, $options: 'i' } },
      { razonSocial: { $regex: term, $options: 'i' } },
      { rfc: { $regex: term, $options: 'i' } },
      { 'direccion.estado': { $regex: term, $options: 'i' } }
          ]
        }
      ]
    }).sort({ createdAt: -1 });
    
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
    
    res.json({
      totalEmpresas,
      empresasActivas
    });
    
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// TTL para bloqueos (10 minutos)
const LOCK_TTL_MS = 10 * 60 * 1000;

// Bloquear una empresa para edición
exports.bloquearEmpresa = async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const Usuario = require('../../schemas/usersSchema/usersSchema');
    const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_super_segura_12345';
    
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);
    if (!usuario || (usuario.rol !== 1 && usuario.area !== 6)) {
      return res.status(403).json({ message: 'Acceso denegado. Área no autorizada.' });
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
    const jwt = require('jsonwebtoken');
    const Usuario = require('../../schemas/usersSchema/usersSchema');
    const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_super_segura_12345';
    
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);
    if (!usuario || (usuario.rol !== 1 && usuario.area !== 6)) {
      return res.status(403).json({ message: 'Acceso denegado. Área no autorizada.' });
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
