const mysql = require('mysql2/promise');
const mongoose = require('mongoose');

// POST /api/tools/migrate/mysql-to-mongo
// Body: { host, user, password, database, table, mongoCollection, batchSize?, offset?, limit?, truncate? }
// Optional: where (SQL WHERE clause string, without the word WHERE)
exports.migrateMySQLToMongo = async (req, res) => {
  const startedAt = Date.now();
  const {
    host,
    user,
    password,
    database,
    table,
    mongoCollection,
    batchSize = 500,
    offset = 0,
    limit = null,
    truncate = false,
    where = ''
  } = req.body || {};

  if (!host || !user || !database || !table || !mongoCollection) {
    return res.status(400).json({ message: 'Parámetros requeridos: host, user, database, table, mongoCollection' });
  }

  let connection;
  try {
    // Conexión MySQL
    connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
      multipleStatements: false,
      timezone: 'Z'
    });
    console.log(`[MIG] Conectado a MySQL ${host}/${database}`);

    // Colección destino en Mongo
    const collection = mongoose.connection.collection(mongoCollection);
    if (!collection) {
      return res.status(400).json({ message: 'Colección Mongo inválida' });
    }

    if (truncate) {
      console.log(`[MIG] Limpiando colección Mongo '${mongoCollection}'...`);
      await collection.deleteMany({});
      console.log(`[MIG] Colección limpiada.`);
    }

    // Contar total a migrar (si no hay limit)
  let totalRows = 0;
    try {
      const [cntRows] = await connection.execute(
        `SELECT COUNT(*) AS total FROM \`${table}\`${where ? ' WHERE ' + where : ''}`
      );
      totalRows = cntRows?.[0]?.total ?? 0;
    } catch (err) {
      console.warn('[MIG] No se pudo contar total de filas:', err.message);
    }

    const effectiveBatch = Math.max(parseInt(batchSize) || 500, 1);
    let currentOffset = Math.max(parseInt(offset) || 0, 0);
    const maxRows = limit != null ? Math.max(parseInt(limit) || 0, 0) : null;
    let insertedTotal = 0;
    let readTotal = 0;
  const totalObjetivo = (maxRows != null && totalRows) ? Math.min(maxRows, totalRows - currentOffset) : (totalRows || null);

    while (true) {
      // Si se definió limit máximo y ya alcanzamos/ superamos, detener
      if (maxRows != null && readTotal >= maxRows) break;

      const batchLimit = maxRows != null ? Math.max(Math.min(effectiveBatch, maxRows - readTotal), 0) : effectiveBatch;
      if (batchLimit <= 0) break;

      const sql = `SELECT * FROM \`${table}\`${where ? ' WHERE ' + where : ''} LIMIT ${batchLimit} OFFSET ${currentOffset}`;
      const [rows] = await connection.execute(sql);
      const count = rows.length;
      if (count === 0) break; // no hay más datos

      readTotal += count;
      currentOffset += count;
      console.log(`[MIG] Leídas ${count} filas (acumuladas: ${readTotal})…`);

      // Transformación y guardado en lote SIN demoras (sin restricciones de tiempo artificiales)
      const docs = rows.map(serializeRow);
      try {
        const ops = docs.map(d => ({ insertOne: { document: d } }));
        const bulkRes = await collection.bulkWrite(ops, { ordered: false });
        const inserted = bulkRes.insertedCount ?? 0;
        insertedTotal += inserted;
      } catch (err) {
        console.warn('[MIG] bulkWrite con errores, intentando contabilizar inserciones parciales:', err.message);
        // Intentar recuperar número insertado en errores de bulk
        const partialInserted = err?.result?.nInserted || err?.result?.result?.nInserted || 0;
        insertedTotal += partialInserted;
        // Fallback: intentar insertar de forma rápida 1x1 las que faltan (sin delays)
        if (partialInserted < docs.length) {
          for (const d of docs) {
            try { await collection.insertOne(d); insertedTotal += 1; } catch (_) { /* duplicados u otros, continuar */ }
          }
        }
      }

      // Log de progreso por lote con ETA basada en throughput real
      if (totalObjetivo) {
        const elapsedSec = (Date.now() - startedAt) / 1000;
        const speed = elapsedSec > 0 ? (insertedTotal / elapsedSec) : 0; // docs/seg
        const restantes = Math.max(totalObjetivo - insertedTotal, 0);
        const etaSec = speed > 0 ? (restantes / speed) : null;
        const etaMin = etaSec != null ? (etaSec / 60).toFixed(1) : 'desconocida';
        console.log(`[MIG] Progreso: ${insertedTotal}/${totalObjetivo} insertados | Velocidad ~${speed.toFixed(1)} doc/s | ETA ~${etaMin} min`);
      } else {
        console.log(`[MIG] Progreso: ${insertedTotal} insertados (total objetivo desconocido)`);
      }
    }

    const durationMs = Date.now() - startedAt;
    console.log(`[MIG] Finalizado. Leídas: ${readTotal}, Insertadas: ${insertedTotal}, Tiempo: ${durationMs}ms`);
    return res.json({ ok: true, readTotal, insertedTotal, totalRows, durationMs });
  } catch (err) {
    console.error('[MIG] Error general:', err);
    return res.status(500).json({ message: 'Error en migración', error: err.message });
  } finally {
    if (connection) {
      try { await connection.end(); } catch (_) {}
    }
  }
};

function serializeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'bigint') {
      out[k] = Number(v);
    } else if (Buffer.isBuffer(v)) {
      out[k] = v.toString('base64');
    } else {
      out[k] = v;
    }
  }
  return out;
}
