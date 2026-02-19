const mongoose = require('mongoose');

const InventarioTecnologiaSchema = new mongoose.Schema({
  numero: {
    type: Number,
    required: true,
    unique: true,
  },
  ip: {
    type: String,
    required: true,
    trim: true
  },
  equipo: {
    type: String,
    required: true,
    trim: true
  },
  area: {
    type: String,
    required: true,
    trim: true
  },
  marca: {
    type: String,
    required: true,
    trim: true
  },
  procesador: {
    type: String,
    required: true,
    trim: true
  },
  ram: {
    type: String,
    required: true,
    trim: true
  },
  discoDuro: {
    type: String,
    required: true,
    trim: true
  },
  numeroInventario: {
    type: String,
    required: true,
    trim: true,
  },
  fechaRegistro: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('InventarioTecnologia', InventarioTecnologiaSchema);
