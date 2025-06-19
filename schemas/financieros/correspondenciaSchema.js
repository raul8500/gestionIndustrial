const mongoose = require('mongoose');

const correspondenciaSchema = new mongoose.Schema({
  numeroOficio: {
    type: String,
  },
  fechaOficio: {
    type: Date,
  },
  fechaRecepcion: {
    type: Date,
  },
  tipoCorrespondencia: {
    type: Number,
  },
  remitente: {
    type: String,
  },
  asunto: {
    type: String,
  },
  tipoRespuesta: {
    type: String,
  },
  turnadoA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: false
  },
  observaciones: {
    type: String,
  },
  tiempoRespuesta: {
    type: Number, // en días, por ejemplo
  },
  status: {
    type: Number,
  },
  archivos: {
    type: [String], // nombres de archivos o rutas relativas
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CorrespondenciaFinancieros', correspondenciaSchema);
