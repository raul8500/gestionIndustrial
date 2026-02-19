const Solicitud = require('../../schemas/transparencia/solicitudesSchema');
const moment = require('moment-timezone');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Listar con paginación y filtro por fechas
exports.obtenerSolicitudes = async (req, res) => {
  try {
  const { q, pagina = 1, limite = 10, fechaDesde, fechaHasta, recurso, estado } = req.query;

    const filtro = {};
    if (q) {
      filtro.$or = [
        { folio: { $regex: q, $options: 'i' } },
        { solicitanteNombre: { $regex: q, $options: 'i' } },
        { areaResponsable: { $regex: q, $options: 'i' } },
        { descripcionSolicitud: { $regex: q, $options: 'i' } }
      ];
    }

    // Filtro por rango de fechas (fechaRecepcion)
    if (fechaDesde || fechaHasta) {
      const rango = {};
      if (fechaDesde) {
        rango.$gte = moment.tz(fechaDesde + 'T00:00:00', 'America/Mexico_City').toDate();
      }
      if (fechaHasta) {
        rango.$lte = moment.tz(fechaHasta + 'T23:59:59', 'America/Mexico_City').toDate();
      }
      filtro.fechaRecepcion = rango;
    }
  // Filtro por recurso de revisión
  if (recurso === 'con') filtro.recursoRevision = true;
  if (recurso === 'sin') filtro.recursoRevision = { $ne: true };

  // Filtros especiales por estado (por vencer o vencidas, sin cumplir)
  if (estado === 'porVencer5' || estado === 'vencidas') {
    // sin fecha de cumplimiento (null o ausente)
    filtro.fechaCumplimiento = { $eq: null };
    const hoyMX = moment.tz('America/Mexico_City').startOf('day');
    if (estado === 'porVencer5') {
      const startWindow = hoyMX.clone().toDate();
      const endWindow = hoyMX.clone().add(5, 'days').endOf('day').toDate();
      filtro.fechaLimiteRespuesta = { $gte: startWindow, $lte: endWindow };
    } else if (estado === 'vencidas') {
      const startToday = hoyMX.clone().startOf('day').toDate();
      filtro.fechaLimiteRespuesta = { $lt: startToday };
    }
  }

    const page = Math.max(parseInt(pagina) || 1, 1);
    const limit = Math.max(parseInt(limite) || 10, 1);
    const skip = (page - 1) * limit;

    const total = await Solicitud.countDocuments(filtro);
    const items = await Solicitud.find(filtro)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPaginas = Math.max(Math.ceil(total / limit), 1);
    const paginacion = {
      pagina: page,
      limite: limit,
      total,
      totalPaginas,
      tieneAnterior: page > 1,
      tieneSiguiente: page < totalPaginas
    };

    res.json({ items, paginacion });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener solicitudes', error: err.message });
  }
};

// Obtener por id
exports.obtenerSolicitud = async (req, res) => {
  try {
    const item = await Solicitud.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Solicitud no encontrada' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener la solicitud', error: err.message });
  }
};

// Crear
exports.crearSolicitud = async (req, res) => {
  try {
    const archivos = req.files?.map(f => f.filename) || [];

    const body = req.body || {};
    const toDate = (d) => d ? moment.tz(d + 'T12:00:00', 'America/Mexico_City').toDate() : undefined;

    const nueva = new Solicitud({
      folio: body.folio,
      fechaRecepcion: toDate(body.fechaRecepcion) || new Date(),
      medioRecepcion: body.medioRecepcion,
      solicitanteNombre: body.solicitanteNombre,
      descripcionSolicitud: body.descripcionSolicitud,
      areaResponsable: body.areaResponsable,
      fechaAsignacion: toDate(body.fechaAsignacion),
      fechaLimiteRespuesta: toDate(body.fechaLimiteRespuesta),
      fechaCumplimiento: toDate(body.fechaCumplimiento),
      satisfaccionCliente: body.satisfaccionCliente === 'true' || body.satisfaccionCliente === true,
      recursoRevision: body.recursoRevision === 'true' || body.recursoRevision === true,
      observaciones: body.observaciones,
      archivos
    });

    await nueva.save();
    res.status(201).json({ message: 'Solicitud creada', solicitud: nueva });
  } catch (err) {
    res.status(400).json({ message: 'Error al crear solicitud', error: err.message });
  }
};

// Actualizar
exports.actualizarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const actual = await Solicitud.findById(id);
    if (!actual) return res.status(404).json({ message: 'Solicitud no encontrada' });

    const body = req.body || {};
    const toDate = (d) => d ? moment.tz(d + 'T12:00:00', 'America/Mexico_City').toDate() : undefined;

    // Archivos: concatenar nuevos si vienen
    const nuevosArchivos = (req.files?.map(f => f.filename) || []);
    const existentes = Array.isArray(actual.archivos) ? actual.archivos : [];
    let archivos = existentes.concat(nuevosArchivos);
    if (body.archivosAEliminar) {
      try {
        const aEliminar = JSON.parse(body.archivosAEliminar);
        if (Array.isArray(aEliminar)) {
          archivos = archivos.filter(n => !aEliminar.includes(n));
        }
      } catch(_) {}
    }

    actual.folio = body.folio ?? actual.folio;
    actual.fechaRecepcion = toDate(body.fechaRecepcion) ?? actual.fechaRecepcion;
    actual.medioRecepcion = body.medioRecepcion ?? actual.medioRecepcion;
    actual.solicitanteNombre = body.solicitanteNombre ?? actual.solicitanteNombre;
    actual.descripcionSolicitud = body.descripcionSolicitud ?? actual.descripcionSolicitud;
    actual.areaResponsable = body.areaResponsable ?? actual.areaResponsable;
    actual.fechaAsignacion = toDate(body.fechaAsignacion) ?? actual.fechaAsignacion;
    actual.fechaLimiteRespuesta = toDate(body.fechaLimiteRespuesta) ?? actual.fechaLimiteRespuesta;
    actual.fechaCumplimiento = toDate(body.fechaCumplimiento) ?? actual.fechaCumplimiento;
    if (body.satisfaccionCliente !== undefined) actual.satisfaccionCliente = (body.satisfaccionCliente === 'true' || body.satisfaccionCliente === true);
    if (body.recursoRevision !== undefined) actual.recursoRevision = (body.recursoRevision === 'true' || body.recursoRevision === true);
    actual.observaciones = body.observaciones ?? actual.observaciones;
    actual.archivos = archivos;

    await actual.save();
    res.json({ message: 'Solicitud actualizada', solicitud: actual });
  } catch (err) {
    res.status(400).json({ message: 'Error al actualizar solicitud', error: err.message });
  }
};

// Eliminar
exports.eliminarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const eliminado = await Solicitud.findByIdAndDelete(id);
    if (!eliminado) return res.status(404).json({ message: 'Solicitud no encontrada' });
    res.json({ message: 'Solicitud eliminada' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar solicitud', error: err.message });
  }
};

// Exportar CSV por rango de fechas (usa fechaRecepcion)
exports.exportarSolicitudes = async (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.body || {};

    const filtro = {};
    if (fechaDesde || fechaHasta) {
      const rango = {};
      if (fechaDesde) rango.$gte = moment.tz(fechaDesde + 'T00:00:00', 'America/Mexico_City').toDate();
      if (fechaHasta) rango.$lte = moment.tz(fechaHasta + 'T23:59:59', 'America/Mexico_City').toDate();
      filtro.fechaRecepcion = rango;
    }

    const items = await Solicitud.find(filtro).sort({ fechaRecepcion: 1 });

    // Generar CSV
    const headers = [
      'folio', 'fechaRecepcion', 'medioRecepcion', 'solicitanteNombre', 'areaResponsable',
      'descripcionSolicitud', 'fechaAsignacion', 'fechaLimiteRespuesta', 'fechaCumplimiento',
      'satisfaccionCliente', 'recursoRevision', 'observaciones', 'archivos'
    ];

        const escapeCSV = (val) => {
          if (val === undefined || val === null) return '';
          let s = String(val);
          if (s.includes('"')) s = s.replace(/"/g, '""');
          if (s.includes(',') || s.includes('\n') || s.includes('\r')) s = '"' + s + '"';
          return s;
        };

    const fmtFecha = (d) => d ? moment(d).tz('America/Mexico_City').format('YYYY-MM-DD') : '';

    const rows = items.map(it => [
      it.folio,
      fmtFecha(it.fechaRecepcion),
      it.medioRecepcion,
      it.solicitanteNombre,
      it.areaResponsable,
      it.descripcionSolicitud,
      fmtFecha(it.fechaAsignacion),
      fmtFecha(it.fechaLimiteRespuesta),
      fmtFecha(it.fechaCumplimiento),
      it.satisfaccionCliente ? 'Sí' : 'No',
      it.recursoRevision ? 'Sí' : 'No',
      it.observaciones || '',
      Array.isArray(it.archivos) ? it.archivos.join('|') : ''
    ].map(escapeCSV).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const nombre = `solicitudes_${fechaDesde || 'inicio'}_a_${fechaHasta || 'fin'}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.status(200).send('\uFEFF' + csv); // BOM para Excel
  } catch (err) {
    res.status(500).json({ message: 'Error al exportar solicitudes', error: err.message });
  }
};

// Stats: total, con recurso de revisión y por vencer en 5 días sin cumplimiento (respeta filtros de fechas)
exports.obtenerStatsSolicitudes = async (req, res) => {
  try {
    const { q, fechaDesde, fechaHasta } = req.query;
    const filtro = {};
    if (q) {
      filtro.$or = [
        { folio: { $regex: q, $options: 'i' } },
        { solicitanteNombre: { $regex: q, $options: 'i' } },
        { areaResponsable: { $regex: q, $options: 'i' } },
        { descripcionSolicitud: { $regex: q, $options: 'i' } }
      ];
    }
    if (fechaDesde || fechaHasta) {
      const rango = {};
      if (fechaDesde) rango.$gte = moment.tz(fechaDesde + 'T00:00:00', 'America/Mexico_City').toDate();
      if (fechaHasta) rango.$lte = moment.tz(fechaHasta + 'T23:59:59', 'America/Mexico_City').toDate();
      filtro.fechaRecepcion = rango;
    }
    // No aplicamos 'recurso' aquí intencionalmente para que las estadísticas sean informativas sobre el rango/búsqueda.
    const total = await Solicitud.countDocuments(filtro);
    const conRecurso = await Solicitud.countDocuments({ ...filtro, recursoRevision: true });

    // Por vencer en 5 días o menos (desde hoy hasta hoy+5), y sin fechaCumplimiento
    const hoyMX = moment.tz('America/Mexico_City').startOf('day');
    const startWindow = hoyMX.clone().toDate();
    const endWindow = hoyMX.clone().add(5, 'days').endOf('day').toDate();
    const porVencer5 = await Solicitud.countDocuments({
      ...filtro,
      fechaCumplimiento: { $eq: null },
      fechaLimiteRespuesta: { $gte: startWindow, $lte: endWindow }
    });

    // Vencidas sin cumplir: límite de respuesta antes de hoy (MX) y sin fecha de cumplimiento
    const startToday = hoyMX.clone().startOf('day').toDate();
    const vencidasSinCumplir = await Solicitud.countDocuments({
      ...filtro,
      fechaCumplimiento: { $eq: null },
      fechaLimiteRespuesta: { $lt: startToday }
    });

    res.json({ total, conRecurso, porVencer5, vencidasSinCumplir });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener estadísticas', error: err.message });
  }
};

// Importar desde Excel (XLS/XLSX) mediante archivo subido (campo form-data: "excel")
exports.importarSolicitudesDesdeExcel = async (req, res) => {
  let filePath;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Sube un archivo Excel en el campo "excel" (form-data)'});
    }
    filePath = req.file.path; // guardado por multer en public/archivos/

    // Leer workbook y tomar la primera hoja
    const workbook = XLSX.readFile(filePath, { cellDates: false, raw: true });
    const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
    // Leer como matriz (header:1) para evitar problemas con encabezados extraños
    const rowsA = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true, blankrows: false });
    // Detectar columnas por encabezado con normalización (insensible a acentos/espacios)
    const normalizeKey = (s) => String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quitar acentos
      .replace(/[^a-z0-9]+/g, '') // quitar separadores
      .trim();
    const headerRow = rowsA[0] || [];
    const headerIndex = {};
    for (let i = 0; i < headerRow.length; i++) {
      const key = normalizeKey(headerRow[i]);
      if (key) headerIndex[key] = i;
    }
    // Intentar mapear por nombre de encabezado
    const exp = {
      folio: ['folio'],
      fechaRecepcion: ['fechaderecepcion'],
      medioRecepcion: ['mediorecepcion'],
      solicitanteNombre: ['nombredelsolicitante'],
      descripcionSolicitud: ['brevedescripciondelasolicitud'],
      areaResponsable: ['arearesponsablededarrespuesta'],
      fechaAsignacion: ['fechadeasignacion'],
      fechaLimiteRespuesta: ['fechalimitepararesponder'],
      fechaCumplimiento: ['fechadecumplimientodelplazo'],
      satisfaccionCliente: ['satisfacciondelsolicitante'],
      recursoRevision: ['recursoderevision'],
      observaciones: ['observaciones']
    };
    const findIdx = (keys) => {
      for (const k of keys) {
        const idx = headerIndex[k];
        if (Number.isInteger(idx)) return idx;
      }
      return undefined;
    };
    // Construir mapeo de columnas (si no se encuentran por nombre, usar heurística)
    let COL = {
      folio: findIdx(exp.folio),
      fechaRecepcion: findIdx(exp.fechaRecepcion),
      medioRecepcion: findIdx(exp.medioRecepcion),
      solicitanteNombre: findIdx(exp.solicitanteNombre),
      descripcionSolicitud: findIdx(exp.descripcionSolicitud),
      areaResponsable: findIdx(exp.areaResponsable),
      fechaAsignacion: findIdx(exp.fechaAsignacion),
      fechaLimiteRespuesta: findIdx(exp.fechaLimiteRespuesta),
      fechaCumplimiento: findIdx(exp.fechaCumplimiento),
      satisfaccionCliente: findIdx(exp.satisfaccionCliente),
      recursoRevision: findIdx(exp.recursoRevision),
      observaciones: findIdx(exp.observaciones)
    };
    // Heurística: si Folio no apareció pero el primer encabezado parece 'no' y el segundo es 'folio'
    const firstKey = normalizeKey(headerRow[0]);
    const secondKey = normalizeKey(headerRow[1]);
    const looksNo = firstKey === 'no' || firstKey === 'numero' || firstKey === 'num';
    if (COL.folio === undefined && looksNo && secondKey === 'folio') {
      COL = { folio: 1, fechaRecepcion: 2, medioRecepcion: 3, solicitanteNombre: 4, descripcionSolicitud: 5, areaResponsable: 6, fechaAsignacion: 7, fechaLimiteRespuesta: 8, fechaCumplimiento: 9, satisfaccionCliente: 10, recursoRevision: 11, observaciones: 12 };
    }
    // Fallback duro si nada se detectó: asumir el orden clásico empezando en columna 0
    if (COL.folio === undefined) {
      COL = { folio: 0, fechaRecepcion: 1, medioRecepcion: 2, solicitanteNombre: 3, descripcionSolicitud: 4, areaResponsable: 5, fechaAsignacion: 6, fechaLimiteRespuesta: 7, fechaCumplimiento: 8, satisfaccionCliente: 9, recursoRevision: 10, observaciones: 11 };
    }

    // Rango a procesar: filas 2..167 (1 es encabezado)
  const startRow = 2; // Excel
  const endRow = 167; // Excel
  const firstIndex = 1; // rowsA[1] es Excel fila 2
  const lastIndex = Math.min(rowsA.length - 1, endRow - 1); // inclusivo
  const sliced = rowsA.slice(firstIndex, lastIndex + 1);
    // Logs de diagnóstico de encabezados y mapeo
    try {
      const normalizedHeaders = (headerRow || []).map(h => normalizeKey(h));
      console.log('[IMP] Headers normalizados:', normalizedHeaders);
      console.log('[IMP] Índices detectados:', COL);
      const previewFolios = sliced.slice(0, 5).map(r => r[COL.folio]);
      console.log('[IMP] Folios de muestra (primeras 5 filas de datos):', previewFolios);
    } catch (_) {}

    // Helpers
    const truthy = new Set(['si','sí','true','1','x','yes','y']);
    const parseBool = (v) => {
      if (v === true) return true;
      if (v === false) return false;
      const s = String(v || '').trim().toLowerCase();
      return truthy.has(s);
    };
    const excelSerialToDate = (n) => {
      // Convierte número de serie de Excel a Date (UTC), luego a MX
      const jsDate = new Date(Math.round((Number(n) - 25569) * 86400 * 1000));
      return moment(jsDate).tz('America/Mexico_City').toDate();
    };
    const isPlaceholder = (s) => {
      if (typeof s !== 'string') return false;
      const t = s.trim().toLowerCase();
      return t === '-' || t === 'n/a' || t === 'na' || t === 'n\\a' || t === '';
    };
    const normalizeEmpty = (v) => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'string' && isPlaceholder(v)) return '';
      return String(v);
    };
    const parseFecha = (v) => {
      try {
        if (v === null || v === undefined || v === '') return undefined;
        if (v instanceof Date) {
          return moment(v).tz('America/Mexico_City').toDate();
        }
        if (typeof v === 'number') {
          return excelSerialToDate(v);
        }
        if (typeof v !== 'string') return undefined;
        if (isPlaceholder(v)) return undefined;
        const s = v.trim();
        // Reemplazar puntos por diagonales para casos tipo 01.02.2024
        const norm = s.replace(/\./g, '/');
        const formats = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'DD-MM-YYYY', 'YYYY/MM/DD'];
  const m = moment(norm, formats, true);
  if (!m.isValid()) return undefined;
  return m.tz('America/Mexico_City').toDate();
      } catch (err) {
        // Evitar que una fecha invalide toda la fila
        return undefined;
      }
    };
    // Ya no usamos get por encabezado; ahora mapeamos por índice de columna.

    // Mapeo de columnas del Excel a campos del esquema
    // Se incluyen variantes sin acentos por robustez
    // Nota: a partir de aquí usamos los índices calculados en COL

    let processed = 0;
    let inserted = 0;
    let updated = 0;
    const errors = [];

    console.log(`[IMP] Iniciando importación de Excel: ${path.basename(filePath)} | Rango solicitado: filas ${startRow}-${endRow}`);
    // Prefetch: folios existentes antes de importar para contar insertados vs actualizados con precisión
  const foliosArchivo = sliced.map(r => String((r[COL.folio] ?? '')).trim()).filter(Boolean);
    const existentesAntesSet = new Set((await Solicitud.find({ folio: { $in: foliosArchivo } }, { folio: 1 }).lean()).map(d => d.folio));

    for (let i = 0; i < sliced.length; i++) {
      const row = sliced[i];
      const sheetRow = startRow + i; // número de fila real en Excel
      processed += 1;
      let step = 'init';
      let rawVals = undefined;
      try {
        step = 'read-folio';
        const folio = String((row[COL.folio] ?? '')).trim();
        if (!folio) {
          const msg = 'Fila sin Folio, se omite';
          console.warn(`[IMP] Fila ${sheetRow}: ${msg}`);
          errors.push({ index: sheetRow, error: msg });
          continue;
        }

        step = 'build-payload';
        rawVals = {
          fechaRecepcion: row[COL.fechaRecepcion],
          medioRecepcion: row[COL.medioRecepcion],
          solicitanteNombre: row[COL.solicitanteNombre],
          descripcionSolicitud: row[COL.descripcionSolicitud],
          areaResponsable: row[COL.areaResponsable],
          fechaAsignacion: row[COL.fechaAsignacion],
          fechaLimiteRespuesta: row[COL.fechaLimiteRespuesta],
          fechaCumplimiento: row[COL.fechaCumplimiento],
          satisfaccionCliente: row[COL.satisfaccionCliente],
          recursoRevision: row[COL.recursoRevision],
          observaciones: row[COL.observaciones]
        };
        const payload = {
          folio,
          fechaRecepcion: parseFecha(rawVals.fechaRecepcion) || undefined,
          medioRecepcion: normalizeEmpty(rawVals.medioRecepcion).trim() || undefined,
          solicitanteNombre: normalizeEmpty(rawVals.solicitanteNombre).trim() || undefined,
          descripcionSolicitud: normalizeEmpty(rawVals.descripcionSolicitud).trim() || undefined,
          areaResponsable: normalizeEmpty(rawVals.areaResponsable).trim() || undefined,
          fechaAsignacion: parseFecha(rawVals.fechaAsignacion) || undefined,
          fechaLimiteRespuesta: parseFecha(rawVals.fechaLimiteRespuesta) || undefined,
          fechaCumplimiento: parseFecha(rawVals.fechaCumplimiento) || undefined,
          satisfaccionCliente: parseBool(rawVals.satisfaccionCliente) || false,
          recursoRevision: parseBool(rawVals.recursoRevision) || false,
          observaciones: normalizeEmpty(rawVals.observaciones).trim() || undefined,
        };

        const existia = existentesAntesSet.has(folio);

        // Upsert por folio (si existe, actualiza; si no, crea)
        step = 'upsert';
        await Solicitud.findOneAndUpdate(
          { folio },
          { $set: payload },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        if (existia) {
          updated += 1;
          if (i % 10 === 0) console.log(`[IMP] Fila ${sheetRow} (Folio ${folio}): actualizado`);
        } else {
          inserted += 1;
          if (i % 10 === 0) console.log(`[IMP] Fila ${sheetRow} (Folio ${folio}): insertado`);
          existentesAntesSet.add(folio);
        }
      } catch (e) {
        const reason = e && e.message ? e.message : 'Error desconocido';
        const typeInfo = (obj) => {
          try {
            return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, { type: typeof v, sample: (v && v.toString ? (''+v).slice(0, 60) : v) }]));
          } catch {
            return {};
          }
        };
        console.error(`[IMP] Fila ${sheetRow}: error en paso '${step}' -> ${reason}`);
        if (typeof e?.stack === 'string') console.error(e.stack.split('\n').slice(0, 3).join('\n'));
        if (step === 'build-payload' && rawVals) console.warn(`[IMP] Tipos detectados fila ${sheetRow}:`, typeInfo(rawVals));
        errors.push({ index: sheetRow, error: `${reason} (step=${step})` });
      }
    }
    console.log(`[IMP] Importación finalizada. Procesadas: ${processed}, Insertadas: ${inserted}, Actualizadas: ${updated}, Errores: ${errors.length}`);
    res.json({ message: 'Importación completada', processed, inserted, updated, errors, rangoProcesado: { desdeFila: startRow, hastaFila: startRow + sliced.length - 1 } });
  } catch (err) {
    res.status(500).json({ message: 'Error al importar desde Excel', error: err.message });
  } finally {
    if (filePath) {
      fs.unlink(filePath, () => {});
    }
  }
};
