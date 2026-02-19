const mongoose = require('mongoose');

const OficioSchema = new mongoose.Schema({
    noOficio: { type: String },
    fecha: { type: Date },
    tipoCorrespondencia: { type: Number },
    institucion: { type: String },
    asunto: { type: String },
    tipoRespuesta: { type: String },
    observaciones: { type: String },
    departamentoTurnado: [{ type: String }], // AHORA es un arreglo de strings
    tiempoRespuesta: { type: Number, default: 0 },
    status: { type: Number, default: 0 },
    archivos: [String]
}, {
    timestamps: true
});

module.exports = mongoose.model('Oficio', OficioSchema);
