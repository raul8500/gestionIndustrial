const mongoose = require('mongoose');

const subFunctionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    path: {
        type: String, // Ruta asociada a la subfunción
        required: true,
    }
}, {
    _id: false // Opcional: No crear un _id para los subdocumentos
});

const functionsUserSchema = new mongoose.Schema({
    nameRol: {
        type: String,
        required: true,
    },
    type: {
        type: Number,
        required: true,
    },
    functions: {
        type: [new mongoose.Schema({
            name: {
                type: String,
                required: true,
            },
            path: {
                type: String, // Ruta asociada a la función principal
                required: false,
            },
            subFunctions: {
                type: [subFunctionSchema], // Subfunciones
                default: [],
            },
        }, {
            _id: false // Opcional: No crear un _id para los subdocumentos
        })],
        required: true,
    },
}, {
    timestamps: true,
    versionKey: false,
});

const ModelFunctionsUser = mongoose.model('functionsUser', functionsUserSchema);
module.exports = ModelFunctionsUser;
