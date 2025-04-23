
const ModelFunctionsUser = require('../../schemas/functionsSchema/functionsSchema');

exports.addFunction = async (req, res) => {
    try {
        const body = req.body
        const respuesta = await ModelFunctionsUser.create(body)
        res.send(respuesta);
    } catch (error) {
        console.log(error);
        res.status(500).send('Error interno del servidor');
    }
};


exports.getFunctionsByRole = async (req, res) => {
    try {
        const { nameRol } = req.params;
        const funciones = await ModelFunctionsUser.findOne({ nameRol: nameRol });

        if (!funciones) {
            return res.status(404).send('Rol no encontrado');
        }

        res.send(funciones);
    } catch (error) {
        console.log(error);
        res.status(500).send('Error interno del servidor');
    }
}; 

exports.getAllFunctions = async (req, res) => {
    try {
        const funciones = await ModelFunctionsUser.find(); // Obtiene todos los documentos

        if (!funciones || funciones.length === 0) {
            return res.status(404).send('No se encontraron funciones');
        }

        res.send(funciones);
    } catch (error) {
        console.log(error);
        res.status(500).send('Error interno del servidor');
    }
};


// Actualizar una función por _id
exports.updateFunctionById = async (req, res) => {
    try {
        const { id } = req.params; // Obtener el ID de los parámetros de la solicitud
        const body = req.body; // Datos que se quieren actualizar

        // Actualizar la función correspondiente
        const updatedFunction = await ModelFunctionsUser.findByIdAndUpdate(id, body, { new: true });

        if (!updatedFunction) {
            return res.status(404).send('Función no encontrada');
        }

        res.send(updatedFunction);
    } catch (error) {
        console.log(error);
        res.status(500).send('Error interno del servidor');
    }
};