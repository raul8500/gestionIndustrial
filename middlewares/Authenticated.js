const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const ModelUser = require('../schemas/usersSchema/usersSchema'); // Asegúrate de que este sea el modelo correcto

exports.isAuthenticated = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRETO);

            // Buscar el usuario por su id en la base de datos
            const user = await ModelUser.findById(decoded.id);

            if (!user) {
                return next();
            }

            req.user = user;
            return next();
        } catch (error) {
            return next();
        }
    } else {
        res.redirect('/login');
    }
};