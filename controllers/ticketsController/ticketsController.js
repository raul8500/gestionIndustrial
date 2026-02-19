// modules/tickets/tickets.controller.js
const Ticket = require('../../schemas/tickets/ticketsSchema');
const PDFDocument = require('pdfkit');
const moment = require('moment-timezone');


// Crear ticket
exports.crearTicket = async (req, res) => {
    try {
        // Convertir la fecha al momento actual en CDMX
        const fechaCDMX = moment().tz('America/Mexico_City').toDate();

        const ticket = new Ticket({
            ...req.body,
            fechaCreacion: fechaCDMX,
            fechaActualizacion: fechaCDMX
        });

        await ticket.save();
        res.status(201).json({ message: 'Ticket creado', ticket });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

//Actualizar ticket
exports.actualizarTicket = async (req, res) => {
    try {
        // Actualizar la fechaActualizacion con la hora actual en CDMX
        const fechaCDMX = moment().tz('America/Mexico_City').toDate();

        const ticket = await Ticket.findByIdAndUpdate(
            req.params.id,
            { ...req.body, fechaActualizacion: fechaCDMX },
            { new: true }
        );

        if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });
        res.json({ message: 'Ticket actualizado', ticket });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Obtener todos
exports.obtenerTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find();
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Obtener uno
exports.obtenerTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });
        res.json(ticket);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Eliminar ticket
exports.eliminarTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findByIdAndDelete(req.params.id);
        if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });
        res.json({ message: 'Ticket eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Generar Reporte
exports.generarReporte = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.params;

    // ✅ Convertir las fechas recibidas a timezone de CDMX y al inicio/fin del día
    const inicio = moment.tz(fechaInicio, 'America/Mexico_City').startOf('day').toDate();
    const fin = moment.tz(fechaFin, 'America/Mexico_City').endOf('day').toDate();

    const tickets = await Ticket.find({
      fechaCreacion: { $gte: inicio, $lte: fin }
    });

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Reporte_Tickets_${fechaInicio}_a_${fechaFin}.pdf"`);

    doc.pipe(res);

    doc.fontSize(18).text('Reporte de Tickets de TICS', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Desde: ${fechaInicio}  Hasta: ${fechaFin}`);
    doc.moveDown();

    tickets.forEach((t, i) => {
      const estadoTexto = ['Abierto', 'En proceso', 'Cerrado'][t.estado] || 'Desconocido';
      const prioridadTexto = ['Baja', 'Media', 'Alta'][t.prioridad] || 'Desconocida';

      doc.text(`${i + 1}. ${t.titulo}`);
      doc.text(`   Solicitante: ${t.solicitante}`);
      doc.text(`   Estado: ${estadoTexto} | Prioridad: ${prioridadTexto}`);
      doc.text(`   Fecha creación: ${moment(t.fechaCreacion).tz('America/Mexico_City').format('DD/MM/YYYY HH:mm')}`);
      
      if (t.fechaActualizacion) {
        doc.text(`   Fecha actualización: ${moment(t.fechaActualizacion).tz('America/Mexico_City').format('DD/MM/YYYY HH:mm')}`);
      }

      if (t.observaciones) doc.text(`   Observaciones: ${t.observaciones}`);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    console.error('Error al generar reporte:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
};

  