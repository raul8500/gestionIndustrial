const Oficio = require('../../schemas/oficiosSchema/oficioSchema');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

// Obtener todos los oficios con paginación
exports.getAllOficios = async (req, res) => {
  try {
    const { 
      orden = 'normal', 
      pagina = 1, 
      limite = 10, 
      busqueda = '',
      tipoCorrespondencia = '',
      status = '',
      fechaDesde = '',
      fechaHasta = ''
    } = req.query;
    
    // Debug: mostrar los parámetros recibidos
    console.log('Parámetros recibidos en getAllOficios:');
    console.log('Orden:', orden);
    console.log('Página:', pagina);
    console.log('Límite:', limite);
    console.log('Búsqueda:', busqueda);
    console.log('Tipo:', tipoCorrespondencia);
    console.log('Status:', status);
    console.log('Fecha desde:', fechaDesde);
    console.log('Fecha hasta:', fechaHasta);
    
    // Convertir a números
    const paginaNum = parseInt(pagina);
    const limiteNum = parseInt(limite);
    const skip = (paginaNum - 1) * limiteNum;
    
    // Construir filtros de búsqueda
    let filtros = {};
    
    // Búsqueda por texto en múltiples campos
    if (busqueda) {
      filtros.$or = [
        { noOficio: { $regex: busqueda, $options: 'i' } },
        { institucion: { $regex: busqueda, $options: 'i' } },
        { asunto: { $regex: busqueda, $options: 'i' } },
        { tipoRespuesta: { $regex: busqueda, $options: 'i' } }
      ];
    }
    
    // Filtro por tipo de correspondencia
    if (tipoCorrespondencia) {
      console.log('Aplicando filtro de tipo:', tipoCorrespondencia, 'tipo de dato:', typeof tipoCorrespondencia);
      filtros.tipoCorrespondencia = tipoCorrespondencia;
      console.log('Filtro tipoCorrespondencia aplicado:', filtros.tipoCorrespondencia);
    } else {
      console.log('No se aplicó filtro de tipo (valor vacío)');
    }
    
    // Filtro por status
    if (status) {
      filtros.status = status;
    }
    
    // Filtros de fecha
    if (fechaDesde || fechaHasta) {
      filtros.fecha = {};
      if (fechaDesde) {
        filtros.fecha.$gte = moment.tz(fechaDesde, 'America/Mexico_City').startOf('day').toDate();
      }
      if (fechaHasta) {
        filtros.fecha.$lte = moment.tz(fechaHasta, 'America/Mexico_City').endOf('day').toDate();
      }
    }
    
    // Opciones de ordenamiento
    let sortOption = {};
    console.log('Orden recibido:', orden);
    
    switch(orden) {
      case 'normal':
        sortOption = { createdAt: -1 }; // Por defecto, más recientes primero
        console.log('Aplicando orden normal:', sortOption);
        break;
      case 'reciente':
        sortOption = { fecha: -1, createdAt: -1 };
        console.log('Aplicando orden reciente:', sortOption);
        break;
      case 'antiguo':
        sortOption = { fecha: 1, createdAt: 1 };
        console.log('Aplicando orden antiguo:', sortOption);
        break;
      default:
        sortOption = { createdAt: -1 };
        console.log('Aplicando orden por defecto:', sortOption);
    }
    
    // Debug: mostrar la consulta final
    console.log('Filtros aplicados:', filtros);
    console.log('Ordenamiento aplicado:', sortOption);
    console.log('Paginación:', { skip, limit: limiteNum });
    
    // Ejecutar consulta con paginación
    const [oficios, total] = await Promise.all([
      Oficio.find(filtros)
        .sort(sortOption)
        .skip(skip)
        .limit(limiteNum)
        .lean(), // Usar lean() para mejor rendimiento
      Oficio.countDocuments(filtros)
    ]);
    
    console.log(`Consulta ejecutada: ${oficios.length} oficios encontrados de ${total} total`);
    
    // Debug: mostrar los tipos de correspondencia de los primeros oficios
    if (oficios.length > 0) {
      console.log('Tipos de correspondencia de los primeros 3 oficios:');
      oficios.slice(0, 3).forEach((oficio, index) => {
        console.log(`Oficio ${index + 1}: tipoCorrespondencia = "${oficio.tipoCorrespondencia}" (tipo: ${typeof oficio.tipoCorrespondencia})`);
      });
    }
    
    // Calcular información de paginación
    const totalPaginas = Math.ceil(total / limiteNum);
    const tieneSiguiente = paginaNum < totalPaginas;
    const tieneAnterior = paginaNum > 1;
    
    res.status(200).json({
      oficios,
      paginacion: {
        pagina: paginaNum,
        limite: limiteNum,
        total,
        totalPaginas,
        tieneSiguiente,
        tieneAnterior
      }
    });
  } catch (err) {
    console.error('Error en getAllOficios:', err);
    res.status(500).json({ message: 'Error al obtener los oficios', error: err.message });
  }
};

// Obtener estadísticas para el dashboard
exports.getOficiosStats = async (req, res) => {
  try {
    console.log('Calculando estadísticas de oficios...');
    
    // Primero, obtener algunos oficios de ejemplo para debugging
    const sampleOficios = await Oficio.find().limit(5).lean();
    console.log('Muestra de oficios para debugging:');
    sampleOficios.forEach((oficio, index) => {
      console.log(`Oficio ${index + 1}:`, {
        noOficio: oficio.noOficio,
        status: oficio.status,
        tipoStatus: typeof oficio.status,
        tipoCorrespondencia: oficio.tipoCorrespondencia,
        tipoTipoCorrespondencia: typeof oficio.tipoCorrespondencia
      });
    });
    
    const stats = await Oficio.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          // Status - manejar tanto strings como números
          pendientes: { 
            $sum: { 
              $cond: [
                { $or: [{ $eq: ['$status', '1'] }, { $eq: ['$status', 1] }] }, 
                1, 
                0 
              ] 
            } 
          },
          enProceso: { 
            $sum: { 
              $cond: [
                { $or: [{ $eq: ['$status', '2'] }, { $eq: ['$status', 2] }] }, 
                1, 
                0 
              ] 
            } 
          },
          finalizados: { 
            $sum: { 
              $cond: [
                { $or: [{ $eq: ['$status', '3'] }, { $eq: ['$status', 3] }] }, 
                1, 
                0 
              ] 
            } 
          },
          // Tipo de correspondencia - manejar tanto strings como números
          internos: { 
            $sum: { 
              $cond: [
                { $or: [{ $eq: ['$tipoCorrespondencia', '1'] }, { $eq: ['$tipoCorrespondencia', 1] }] }, 
                1, 
                0 
              ] 
            } 
          },
          externos: { 
            $sum: { 
              $cond: [
                { $or: [{ $eq: ['$tipoCorrespondencia', '2'] }, { $eq: ['$tipoCorrespondencia', 2] }] }, 
                1, 
                0 
              ] 
            } 
          }
        }
      }
    ]);
    
    const result = stats[0] || {};
    console.log('Estadísticas calculadas:', result);
    
    res.status(200).json({ stats: result });
  } catch (err) {
    console.error('Error en getOficiosStats:', err);
    res.status(500).json({ message: 'Error al obtener estadísticas', error: err.message });
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

// Exportar oficios a Excel
exports.exportOficios = async (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.body;
    
    console.log('Exportando oficios desde:', fechaDesde, 'hasta:', fechaHasta);
    
    // Validar fechas
    if (!fechaDesde || !fechaHasta) {
      return res.status(400).json({ message: 'Las fechas desde y hasta son requeridas' });
    }
    
    // Construir filtros de fecha
    const filtros = {
      fecha: {
        $gte: moment.tz(fechaDesde, 'America/Mexico_City').startOf('day').toDate(),
        $lte: moment.tz(fechaHasta, 'America/Mexico_City').endOf('day').toDate()
      }
    };
    
    // Obtener oficios del rango de fechas
    const oficios = await Oficio.find(filtros).sort({ fecha: 1 });
    
    console.log(`Encontrados ${oficios.length} oficios para exportar`);
    
    if (oficios.length === 0) {
      return res.status(404).json({ message: 'No se encontraron oficios en el rango de fechas especificado' });
    }
    
    // Crear contenido CSV (más simple que Excel para empezar)
    let csvContent = 'No. Oficio,Fecha,Tipo Correspondencia,Institución,Asunto,Tipo Respuesta,Departamentos Turnados,Status,Observaciones\n';
    
    oficios.forEach(oficio => {
      const fecha = moment.tz(oficio.fecha, 'America/Mexico_City').format('DD/MM/YYYY');
      const tipoCorrespondencia = oficio.tipoCorrespondencia === '1' || oficio.tipoCorrespondencia === 1 ? 'Interno' : 'Externo';
      const status = oficio.status === '1' || oficio.status === 1 ? 'Pendiente' : 
                     oficio.status === '2' || oficio.status === 2 ? 'En Proceso' : 
                     oficio.status === '3' || oficio.status === 3 ? 'Finalizado' : 'Desconocido';
      const departamentos = Array.isArray(oficio.departamentoTurnado) ? oficio.departamentoTurnado.join('; ') : oficio.departamentoTurnado || '';
      const observaciones = oficio.observaciones || '';
      
             // Escapar comillas y comas en los campos
       const escapeField = (field) => {
         if (typeof field === 'string') {
           // Limpiar caracteres problemáticos y normalizar espacios
           let cleanField = field
             .replace(/\r\n/g, ' ')  // Reemplazar saltos de línea
             .replace(/\n/g, ' ')    // Reemplazar saltos de línea
             .replace(/\r/g, ' ')    // Reemplazar retornos de carro
             .replace(/\t/g, ' ')    // Reemplazar tabulaciones
             .replace(/\s+/g, ' ')   // Normalizar espacios múltiples
             .trim();                // Eliminar espacios al inicio y final
           
           // Si contiene comas, comillas o saltos de línea, envolver en comillas
           if (cleanField.includes(',') || cleanField.includes('"') || cleanField.includes('\n')) {
             return `"${cleanField.replace(/"/g, '""')}"`;
           }
           
           return cleanField;
         }
         return field || '';
       };
      
      const row = [
        escapeField(oficio.noOficio),
        fecha,
        tipoCorrespondencia,
        escapeField(oficio.institucion),
        escapeField(oficio.asunto),
        escapeField(oficio.tipoRespuesta),
        escapeField(departamentos),
        status,
        escapeField(observaciones)
      ].join(',');
      
      csvContent += row + '\n';
    });
    
         // Configurar headers para descarga con BOM para Excel
     const filename = `oficios_${fechaDesde}_a_${fechaHasta}_${moment().format('YYYY-MM-DD')}.csv`;
     
     // Agregar BOM (Byte Order Mark) para UTF-8 al inicio del CSV
     const bom = '\uFEFF';
     const csvWithBom = bom + csvContent;
     
     res.setHeader('Content-Type', 'text/csv; charset=utf-8');
     res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
     res.setHeader('Content-Length', Buffer.byteLength(csvWithBom, 'utf8'));
     res.setHeader('Cache-Control', 'no-cache');
     res.setHeader('Pragma', 'no-cache');
     
     // Enviar el archivo con BOM
     res.send(csvWithBom);
    
  } catch (err) {
    console.error('Error en exportación:', err);
    res.status(500).json({ message: 'Error al exportar los oficios', error: err.message });
  }
};
