const mongoose = require('mongoose');

const tipoEmpresaSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, unique: true },
  status: { type: Number, default: 1, enum: [0, 1] },
  isDeleted: { type: Boolean, default: false },
  area: { type: Number, default: 6, required: true }
}, {
  timestamps: true,
  versionKey: false
});

tipoEmpresaSchema.index({ nombre: 1 }, { unique: true, name: 'nombreTipoEmpresa' });
tipoEmpresaSchema.index({ status: 1, isDeleted: 1 });

const TipoEmpresa = mongoose.model('TipoEmpresa', tipoEmpresaSchema);
module.exports = TipoEmpresa;
