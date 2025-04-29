const mongoose = require('mongoose');

const OficioSchema = new mongoose.Schema({
    noOficio: { type: String },
    fecha: { type: Date },
    tipoCorrespondencia: { type: Number },
    institucion: { type: String },
    asunto: { type: String },
    tipoRespuesta: { type: String },
    observaciones: { type: String },
    departamentoTurnado: { type: String },
    tiempoRespuesta: { type: Number, default: 0 },
    status: { type: Number, default: 0 },
    archivos: [String] // AHORA es un array de archivos
}, {
    timestamps: true
});

module.exports = mongoose.model('Oficio', OficioSchema);
