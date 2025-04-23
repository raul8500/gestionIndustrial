const jwt = require('jsonwebtoken');
const { promisify } = require('util');

exports.isAdminVerify = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRETO);

            // Buscar el usuario por su id en la base de datos
            const user = await ModelUser.findById(decoded.id);

            if (!user || user.rol !== 1) {
                return res.status(200).json({ isAdmin: 0 });
            }

            req.user = user;
            return res.status(200).json({ isAdmin: 1 });
        } catch (error) {
            return res.status(500).json({ isAdmin: 0 });
        }
    } else {
        return res.status(200).json({ isAdmin: 0 });
    }
};