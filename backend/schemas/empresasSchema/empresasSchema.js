const mongoose = require('mongoose');

// Schema para empresas
const empresasSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: true,
    unique: true
  },
  razonSocial: {
    type: String,
    required: true,
    trim: true
  },
  sucursal: {
    type: String,
    required: false,
    trim: true
  },
  rfc: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  direccion: {
    calle: {
      type: String,
      required: true,
      trim: true
    },
    noExterior: {
      type: String,
      required: false,
      trim: true
    },
    noInterior: {
      type: String,
      required: false,
      trim: true
    },
    colonia: {
      type: String,
      required: true,
      trim: true
    },
    cp: {
      type: String,
      required: true,
      trim: true
    },
    localidad: {
      type: String,
      required: false,
      trim: true
    },
    municipio: {
      type: String,
      required: true,
      trim: true
    },
    estado: {
      type: String,
      required: true,
      trim: true
    },
    latitud: {
      type: String,
      required: false,
      trim: true
    },
    longitud: {
      type: String,
      required: false,
      trim: true
    }
  },
  telefono: {
    type: String,
    required: true,
    trim: true
  },
  correo: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  // Sector de la empresa (catálogo gestionable)
  sector: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sector',
    required: false
  },
  // Actividad económica (catálogo gestionable)
  actividadEconomica: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ActividadEconomica',
    required: false
  },
  // Datos para notificaciones
  notificaciones: {
    calle: {
      type: String,
      required: false,
      trim: true
    },
    noExterior: {
      type: String,
      required: false,
      trim: true
    },
    noInterior: {
      type: String,
      required: false,
      trim: true
    },
    colonia: {
      type: String,
      required: false,
      trim: true
    },
    cp: {
      type: String,
      required: false,
      trim: true
    },
    localidad: {
      type: String,
      required: false,
      trim: true
    },
    municipio: {
      type: String,
      required: false,
      trim: true
    },
    telefono: {
      type: String,
      required: false,
      trim: true
    },
    correo: {
      type: String,
      required: false,
      trim: true,
      lowercase: true
    }
  },
  representanteLegal: {
    nombre: {
      type: String,
      required: true,
      trim: true
    },
    correo: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    telefono: {
      type: String,
      required: true,
      trim: true
    }
  },
  status: {
    type: Number,
    default: 1, // 1: Activo, 0: Inactivo
    enum: [0, 1]
  },
  // Campos para bloqueo durante edición
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    default: null
  },
  lockedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false, // false: No borrada, true: Borrada
    required: true
  },
  area: {
    type: Number,
    default: 6, // Área de gestión ambiental
    required: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Middleware pre-save para generar código automáticamente
empresasSchema.pre('save', async function(next) {
  if (this.isNew && !this.codigo) {
    // Generar código DGRI-XXXXX no consecutivo
    const base = Date.now() % 100000;
    const rand = Math.floor(Math.random() * 90000) + 10000;
    const num = ((base + rand) % 90000) + 10000;
    this.codigo = `DGRI-${num}`;
  }
  
  // Inicializar campos de notificaciones si no existen
  if (!this.notificaciones) {
    this.notificaciones = {
      calle: '',
      noExterior: '',
      noInterior: '',
      colonia: '',
      cp: '',
      localidad: '',
      municipio: '',
      telefono: '',
      correo: ''
    };
  }
  
  // Inicializar campos de dirección opcionales si no existen
  if (this.direccion) {
    if (!this.direccion.noExterior) this.direccion.noExterior = '';
    if (!this.direccion.noInterior) this.direccion.noInterior = '';
    if (!this.direccion.localidad) this.direccion.localidad = '';
  }
  
  next();
});

// Índices para mejorar búsquedas
empresasSchema.index({ codigo: 1 }, { name: 'codigoEmpresas' });
empresasSchema.index({ rfc: 1 }, { name: 'rfcEmpresas' });
empresasSchema.index({ razonSocial: 1 }, { name: 'razonSocialEmpresas' });
empresasSchema.index({ 'direccion.calle': 1 }, { name: 'direccionCalleEmpresas' });
empresasSchema.index({ 'direccion.colonia': 1 }, { name: 'direccionColoniaEmpresas' });
empresasSchema.index({ 'direccion.localidad': 1 }, { name: 'direccionLocalidadEmpresas' });
empresasSchema.index({ 'direccion.municipio': 1 }, { name: 'direccionMunicipioEmpresas' });
empresasSchema.index({ 'direccion.estado': 1 }, { name: 'direccionEstadoEmpresas' });
empresasSchema.index({ 'notificaciones.calle': 1 }, { name: 'notificacionesCalleEmpresas' });
empresasSchema.index({ 'notificaciones.colonia': 1 }, { name: 'notificacionesColoniaEmpresas' });
empresasSchema.index({ 'notificaciones.localidad': 1 }, { name: 'notificacionesLocalidadEmpresas' });
empresasSchema.index({ 'notificaciones.municipio': 1 }, { name: 'notificacionesMunicipioEmpresas' });
empresasSchema.index({ status: 1 }, { name: 'statusEmpresas' });
empresasSchema.index({ isDeleted: 1 }, { name: 'isDeletedEmpresas' });
empresasSchema.index({ area: 1 }, { name: 'areaEmpresas' });

// Índice compuesto para validaciones de RFC + status
empresasSchema.index({ rfc: 1, status: 1 }, { name: 'rfcStatusEmpresas' });

// Método estático para generar código único DGRI-XXXXX (no consecutivo)
empresasSchema.statics.generarCodigoUnico = async function() {
  let codigo;
  let existe = true;

  while (existe) {
    // Generar número de 5 dígitos combinando timestamp y random
    const base = Date.now() % 100000;
    const rand = Math.floor(Math.random() * 90000) + 10000;
    const num = ((base + rand) % 90000) + 10000; // Siempre 5 dígitos (10000-99999)
    codigo = `DGRI-${num}`;
    existe = !!(await this.findOne({ codigo }));
  }

  return codigo;
};

// Método para obtener empresas por área
empresasSchema.statics.obtenerPorArea = function(area) {
  return this.find({ area, isDeleted: false }).sort({ createdAt: -1 });
};

// Método para buscar empresas
empresasSchema.statics.buscarEmpresas = function(criterio) {
  return this.find({
    $or: [
      { codigo: { $regex: criterio, $options: 'i' } },
      { razonSocial: { $regex: criterio, $options: 'i' } },
      { rfc: { $regex: criterio, $options: 'i' } },
      { 'direccion.calle': { $regex: criterio, $options: 'i' } },
      { 'direccion.colonia': { $regex: criterio, $options: 'i' } },
      { 'direccion.localidad': { $regex: criterio, $options: 'i' } },
      { 'direccion.municipio': { $regex: criterio, $options: 'i' } },
      { 'direccion.estado': { $regex: criterio, $options: 'i' } },
      { 'notificaciones.calle': { $regex: criterio, $options: 'i' } },
      { 'notificaciones.colonia': { $regex: criterio, $options: 'i' } },
      { 'notificaciones.localidad': { $regex: criterio, $options: 'i' } },
      { 'notificaciones.municipio': { $regex: criterio, $options: 'i' } }
    ],
    isDeleted: false
  }).sort({ createdAt: -1 });
};

const Empresa = mongoose.model('Empresa', empresasSchema);

module.exports = Empresa;
