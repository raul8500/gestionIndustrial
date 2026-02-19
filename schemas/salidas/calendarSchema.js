const mongoose = require('mongoose');
const moment = require('moment-timezone');

const salidaSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'El título es obligatorio'],
        trim: true,
        maxlength: [100, 'El título no puede exceder 100 caracteres']
    },
    description: { 
        type: String, 
        trim: true,
        maxlength: [500, 'La descripción no puede exceder 500 caracteres']
    },
    dateSalida: { 
        type: Date, 
        required: [true, 'La fecha de salida es obligatoria'],
        validate: {
            validator: function(value) {
                const hoy = moment.tz('America/Mexico_City');
                
                // Convertir value a zona horaria de CDMX
                let fechaSalida;
                if (value instanceof Date) {
                    fechaSalida = moment.tz(value, 'America/Mexico_City');
                } else {
                    fechaSalida = moment.tz(value, 'America/Mexico_City');
                }
                
                // Comparar solo las fechas (YYYY-MM-DD) en zona horaria de CDMX
                const fechaSalidaStr = fechaSalida.format('YYYY-MM-DD');
                const hoyStr = hoy.format('YYYY-MM-DD');
                
                console.log('=== VALIDACIÓN SCHEMA ===');
                console.log('Valor recibido:', value);
                console.log('Fecha salida (CDMX):', fechaSalida.format('YYYY-MM-DD HH:mm:ss'));
                console.log('Fecha salida (string):', fechaSalidaStr);
                console.log('Hoy (CDMX):', hoy.format('YYYY-MM-DD HH:mm:ss'));
                console.log('Hoy (string):', hoyStr);
                console.log('¿Fecha salida >= hoy?', fechaSalidaStr >= hoyStr);
                
                return fechaSalidaStr >= hoyStr;
            },
            message: 'No se puede crear una salida para fechas pasadas'
        }
    },
    dateRegreso: { 
        type: Date,
        validate: {
            validator: function(value) {
                if (!value) return true;
                
                // Obtener la fecha de salida del documento en zona horaria de CDMX
                let fechaSalida;
                if (this.dateSalida instanceof Date) {
                    fechaSalida = moment.tz(this.dateSalida, 'America/Mexico_City');
                } else {
                    fechaSalida = moment.tz(this.dateSalida, 'America/Mexico_City');
                }
                
                // Convertir la fecha de regreso a zona horaria de CDMX
                let fechaRegreso;
                if (value instanceof Date) {
                    fechaRegreso = moment.tz(value, 'America/Mexico_City');
                } else {
                    fechaRegreso = moment.tz(value, 'America/Mexico_City');
                }
                
                // Comparar solo las fechas (YYYY-MM-DD) en zona horaria de CDMX
                const fechaSalidaStr = fechaSalida.format('YYYY-MM-DD');
                const fechaRegresoStr = fechaRegreso.format('YYYY-MM-DD');
                
                return fechaRegresoStr >= fechaSalidaStr;
            },
            message: 'La fecha de regreso no puede ser anterior a la fecha de salida'
        }
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'users', 
        required: true
    },
    status: {
        type: String,
        enum: ['activa', 'completada', 'cancelada'],
        default: 'activa'
    }
}, {
    timestamps: true,
    versionKey: false
});

// Índices para mejorar el rendimiento
salidaSchema.index({ dateSalida: 1 });
salidaSchema.index({ dateRegreso: 1 });
salidaSchema.index({ createdBy: 1 });
salidaSchema.index({ status: 1 });

module.exports = mongoose.model('Salida', salidaSchema);