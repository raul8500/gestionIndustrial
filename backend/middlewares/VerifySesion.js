const jwt = require('jsonwebtoken');
const ModelUser = require('../schemas/usersSchema/usersSchema'); // Asegúrate de que este sea el modelo correcto

exports.verifyToken = async (req, res) => {
    // Obtener el token desde la cookie llamada 'jwt'
    const token = req.cookies.jwt;

    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        // Verificar y decodificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRETO);

        // Buscar al usuario por el ID decodificado del token
        const user = await ModelUser.findById(decoded.id);

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // Devolver la información del usuario como respuesta
        return res.json(user);
    } catch (error) {
        console.error(error);
        return res.status(401).json({ message: 'Token inválido.' });
    }
};
