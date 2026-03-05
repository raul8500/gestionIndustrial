const mongoose = require('mongoose');

const actividadEconomicaSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, unique: true },
  status: { type: Number, default: 1, enum: [0, 1] },
  isDeleted: { type: Boolean, default: false },
  area: { type: Number, default: 6, required: true }
}, {
  timestamps: true,
  versionKey: false
});

actividadEconomicaSchema.index({ nombre: 1 }, { unique: true, name: 'nombreActividadEconomica' });
actividadEconomicaSchema.index({ status: 1, isDeleted: 1 });

const ActividadEconomica = mongoose.model('ActividadEconomica', actividadEconomicaSchema);
module.exports = ActividadEconomica;
