const mongoose = require('mongoose');

const solicitudesSchema = new mongoose.Schema({
  folio: { type: String, required: true, trim: true, unique: true },
  fechaRecepcion: { type: Date, required: true },
  medioRecepcion: { type: String, required: true, trim: true },
  solicitanteNombre: { type: String, required: true, trim: true },
  descripcionSolicitud: { type: String, required: true, trim: true },
  areaResponsable: { type: String, required: true, trim: true },
  fechaAsignacion: { type: Date, required: false },
  fechaLimiteRespuesta: { type: Date, required: false },
  fechaCumplimiento: { type: Date, required: false },
  satisfaccionCliente: { type: Boolean, default: false },
  recursoRevision: { type: Boolean, default: false },
  observaciones: { type: String, required: false, trim: true },
  archivos: { type: [String], default: [] }
}, {
  timestamps: true,
  versionKey: false
});

solicitudesSchema.index({ folio: 1 }, { unique: true });
solicitudesSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SolicitudTransparencia', solicitudesSchema);
