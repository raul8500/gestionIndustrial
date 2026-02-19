const mongoose = require('mongoose');

const tecnicoAmbientalSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  status: { type: Number, default: 1, enum: [0, 1] },
  area: { type: Number, default: 6, required: true },
  isDeleted: { type: Boolean, default: false, required: true }
}, { timestamps: true, versionKey: false });

tecnicoAmbientalSchema.index({ nombre: 1, isDeleted: 1 }, { unique: true, partialFilterExpression: { isDeleted: false }, name: 'uniqNombreTecnico' });
tecnicoAmbientalSchema.index({ status: 1 }, { name: 'statusTecnicos' });
tecnicoAmbientalSchema.index({ isDeleted: 1 }, { name: 'isDeletedTecnicos' });
tecnicoAmbientalSchema.index({ area: 1 }, { name: 'areaTecnicos' });

module.exports = mongoose.model('TecnicoAmbiental', tecnicoAmbientalSchema);
