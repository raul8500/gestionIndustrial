// modules/tickets/tickets.model.js
const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    descripcion: { type: String, required: true },
    solicitante: { type: String, required: true },
    estado: { type: Number, default: 0 },
    prioridad: { type: Number, default: 1 },
    fechaCreacion: { type: Date, default: Date.now },
    fechaActualizacion: { type: Date, default: Date.now },
    observaciones: { type: String, required: false },

});

module.exports = mongoose.model('Ticket', TicketSchema);
