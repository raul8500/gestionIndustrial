const mongoose = require('mongoose');

const CorrespondenciaSchema = new mongoose.Schema({
  folioOficial: { type: String, required: true },
  fechaRegistro: { type: Date, required: true },
  fechaOficio: { type: Date },
  numeroOficio: { type: String },
  remite: { type: String },
  cargoDependencia: { type: String },
  asunto: { type: String },
  comentarios: { type: String },
  tarjetaTurno: { type: String },
  archivos: [String], // nombres de archivo
  eliminado: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Correspondencia', CorrespondenciaSchema);
