const mongoose = require('mongoose');

// Subfunciones
const subFunctionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  }
}, { _id: false });

// Funciones individuales dentro de un área
const functionItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  subFunctions: {
    type: [subFunctionSchema],
    default: []
  }
}, { _id: false });

// Área con grupo de funciones
const functionAreaSchema = new mongoose.Schema({
  area: {
    type: String,
    required: true
  },
  items: {
    type: [functionItemSchema],
    required: true
  }
}, { _id: false });

// Schema principal
const functionsUserSchema = new mongoose.Schema({
  nameRol: {
    type: String,
    required: true
  },
  type: {
    type: Number,
    required: true
  },
  functions: {
    type: [functionAreaSchema], // agrupado por área
    required: true
  }
}, {
  timestamps: true,
  versionKey: false
});

const ModelFunctionsUser = mongoose.model('functionsUser', functionsUserSchema);
module.exports = ModelFunctionsUser;
