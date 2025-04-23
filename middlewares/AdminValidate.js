const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const ModelUser = require('../schemas/usersSchema/usersSchema');


exports.isAdmin = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRETO);

            // Buscar el usuario por su id en la base de datos
            const user = await ModelUser.findById(decoded.id);

            if (!user || user.rol !== 1) {
                return res.redirect('/main');
            }

            req.user = user;
            return next();
        } catch (error) {
            return next(error);
        }
    } else {
        res.redirect('/main');
    }
};