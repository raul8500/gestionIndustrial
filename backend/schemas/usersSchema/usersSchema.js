const mongoose = require('mongoose');

const userModel = new mongoose.Schema(
  {
    name: {
      type: String
    },
    username: {
      type: String
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      default: null
    },
    rol: {
      type: Number
    },
    password: {
      type: String
    },
    status: {
      type: Number
    },

    // ✅ Puede crear usuarios
    puedeCrearUsuarios: {
      type: Boolean,
      default: false
    },

    gestionAmbiental: {
      type: Number,
    },

    area: {
      type: Number,
      default: null
    },

    // Departamento para trámites (1=Industrial, 2=Agua y Aire, 3=Impacto, 4=Residuos, 5=Dirección)
    departamento: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const ModelUser = mongoose.model("users", userModel);
module.exports = ModelUser;
