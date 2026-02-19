const mongoose = require('mongoose');

// Schema para trámites de gestión ambiental
const tramitesSchema = new mongoose.Schema({
  folioOficialia: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  empresa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true
  },
  fechaEntrada: {
    type: Date,
    required: true,
    default: Date.now
  },
  tipoTramite: {
    type: String,
    required: true,
    enum: [
      'GRME',
      'PM', 
      'AARME',
      'TRME',
      'LAF',
      'CEOA',
      'Informacion Comp. GRME',
      'Informacion Comp. PM',
      'Informacion Comp. AARME',
      'Informacion Comp. LAF',
      'Respuesta General',
      'Opinion Tecnica GRME',
      'Opinion Tecnica PM',
      'Opinion Tecnica TRME',
      'Opinion Tecnica AARME',
      'Opinion Tecnica LAF',
      'Opinion Tecnica CEOA',
      'Copias Certificadas',
      'Condicionantes y/o Terminos',
      'Inf Adicional',
      'Denuncias',
      'Bajas',
      'Avisos',
      'Otros',
      'Alcance'
    ]
  },
  asuntoEspecifico: {
    type: String,
    required: true,
    enum: [
      'Solicitud de registro',
      'Seguimiento',
      'Autorizacion'
    ]
  },
  observaciones: {
    type: String,
    required: false,
    trim: true
  },
  // Observaciones específicas al momento de notificar (separadas de las observaciones del trámite)
  observacionesNotificacion: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    required: true,
    enum: [
      'Ingresado al area',
      'Turnado con tecnico evaluador',
      'Proceso de firma con jefe de departamento',
      'Turnado a direccion',
      'Resguardo para notificar',
      'Notificado'
    ],
    default: 'Ingresado al area'
  },
  // Técnicos asignados: soporta IDs (ObjectId) del catálogo y códigos numéricos legados
  tecnicos: [{
    type: mongoose.Schema.Types.Mixed,
    required: false
  }],
  numeroPaginas: {
    type: Number,
    required: false,
    min: 1
  },
  tiempoEstimadoSalida: {
    type: Date,
    required: false
  },
  // Fecha en que se marcó como Notificado
  notificadoAt: {
    type: Date,
    required: false,
    default: null
  },
  hologramaAplica: {
    type: Boolean,
    default: false
  },
  numeroHolograma: {
    type: String,
    trim: true,
    default: null
  },
  fechaNotificacion: {
    type: Date,
    default: null
  },
  hojasNotificacion: {
    type: Number,
    default: null,
    min: 1
  },
  mesNotificacion: {
    type: String,
    trim: true,
    default: null
  },
  anioNotificacion: {
    type: Number,
    default: null
  },
  // Vigencia aplicable sólo a tipos GRME y PM
  vigenciaInicio: {
    type: Date,
    default: null
  },
  vigenciaFin: {
    type: Date,
    default: null
  },
  // Número de autorización (sólo aplica a GRME y PM)
  numeroAutorizacion: {
    type: String,
    trim: true,
    default: null
  },
  mesCapturado: {
    type: String,
    required: true,
    default: function() {
      const fecha = new Date();
      const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      return meses[fecha.getMonth()];
    }
  },
  anioCapturado: {
    type: Number,
    required: true,
    default: function() {
      return new Date().getFullYear();
    }
  },
  // Borrado lógico
  isDeleted: {
    type: Boolean,
    default: false,
    required: true
  },
  // Auditoría del último cambio
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: false,
    default: null
  },
  lastModifiedAt: {
    type: Date,
    required: false,
    default: null
  },
  lastChange: {
    type: String,
    required: false,
    trim: true,
    default: null,
    maxlength: 1000
  }
}, {
  timestamps: true,
  versionKey: false
});

// Bloqueo temporal para edición concurrente
tramitesSchema.add({
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: false, default: null },
  lockedAt: { type: Date, required: false, default: null }
});

// Middleware pre-save para setear mes y año de captura
tramitesSchema.pre('save', function(next) {
  // Actualizar mes y año de captura
  if (this.isNew) {
    const fecha = new Date();
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    this.mesCapturado = meses[fecha.getMonth()];
    this.anioCapturado = fecha.getFullYear();
  }
  
  next();
});

// Índices para mejorar búsquedas
tramitesSchema.index({ folioOficialia: 1 }, { name: 'folioOficialiaTramites' });
tramitesSchema.index({ empresa: 1 }, { name: 'empresaTramites' });
tramitesSchema.index({ fechaEntrada: 1 }, { name: 'fechaEntradaTramites' });
tramitesSchema.index({ tipoTramite: 1 }, { name: 'tipoTramiteTramites' });
tramitesSchema.index({ asuntoEspecifico: 1 }, { name: 'asuntoEspecificoTramites' });
tramitesSchema.index({ status: 1 }, { name: 'statusTramites' });
tramitesSchema.index({ mesCapturado: 1 }, { name: 'mesCapturadoTramites' });
tramitesSchema.index({ anioCapturado: 1 }, { name: 'anioCapturadoTramites' });
tramitesSchema.index({ isDeleted: 1 }, { name: 'isDeletedTramites' });
tramitesSchema.index({ lastModifiedAt: 1 }, { name: 'lastModifiedAtTramites' });
tramitesSchema.index({ createdAt: 1 }, { name: 'createdAtTramites' });
tramitesSchema.index({ lockedAt: 1 }, { name: 'lockedAtTramites' });

// Índices compuestos para consultas comunes
tramitesSchema.index({ empresa: 1, status: 1 }, { name: 'empresaStatusTramites' });
tramitesSchema.index({ tipoTramite: 1, status: 1 }, { name: 'tipoTramiteStatusTramites' });
tramitesSchema.index({ mesCapturado: 1, anioCapturado: 1 }, { name: 'mesAnioCapturadoTramites' });

// Método estático para generar folio único
tramitesSchema.statics.generarFolioUnico = async function() {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  const hora = String(fecha.getHours()).padStart(2, '0');
  const minuto = String(fecha.getMinutes()).padStart(2, '0');
  
  let folio = `TRAM-${anio}${mes}${dia}-${hora}${minuto}`;
  let contador = 1;
  let folioOriginal = folio;
  
  // Verificar si el folio ya existe y generar uno único
  while (await this.findOne({ folioOficialia: folio })) {
    folio = `${folioOriginal}-${contador}`;
    contador++;
  }
  
  return folio;
};

// Método para obtener trámites por empresa
tramitesSchema.statics.obtenerPorEmpresa = function(empresaId) {
  return this.find({ empresa: empresaId, isDeleted: false })
    .populate('empresa', 'codigo razonSocial')
    .sort({ fechaEntrada: -1 });
};

// Método para obtener trámites por status
tramitesSchema.statics.obtenerPorStatus = function(status) {
  return this.find({ status, isDeleted: false })
    .populate('empresa', 'codigo razonSocial')
    .sort({ fechaEntrada: -1 });
};

// Método para buscar trámites
tramitesSchema.statics.buscarTramites = function(criterio) {
  return this.find({
    $or: [
      { folioOficialia: { $regex: criterio, $options: 'i' } },
      { 'empresa.codigo': { $regex: criterio, $options: 'i' } },
      { 'empresa.razonSocial': { $regex: criterio, $options: 'i' } },
      { tipoTramite: { $regex: criterio, $options: 'i' } },
      { asuntoEspecifico: { $regex: criterio, $options: 'i' } },
      { observaciones: { $regex: criterio, $options: 'i' } }
    ],
    isDeleted: false
  })
  .populate('empresa', 'codigo razonSocial')
  .sort({ fechaEntrada: -1 });
};

// Método para obtener estadísticas por mes y año
tramitesSchema.statics.obtenerEstadisticas = function(mes, anio) {
  return this.aggregate([
    { $match: { mesCapturado: mes, anioCapturado: anio, isDeleted: false } },
    { $group: { 
      _id: '$status', 
      count: { $sum: 1 } 
    }},
    { $sort: { count: -1 } }
  ]);
};

const Tramite = mongoose.model('Tramite', tramitesSchema);

module.exports = Tramite;
