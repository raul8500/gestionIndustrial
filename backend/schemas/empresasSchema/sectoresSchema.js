const mongoose = require('mongoose');

const sectorSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, unique: true },
  status: { type: Number, default: 1, enum: [0, 1] },
  isDeleted: { type: Boolean, default: false },
  area: { type: Number, default: 6, required: true }
}, {
  timestamps: true,
  versionKey: false
});

sectorSchema.index({ nombre: 1 }, { unique: true, name: 'nombreSector' });
sectorSchema.index({ status: 1, isDeleted: 1 });

const Sector = mongoose.model('Sector', sectorSchema);
module.exports = Sector;
