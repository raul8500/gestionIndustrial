const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const ModelUser = require('../schemas/usersSchema/usersSchema'); // Modelo de usuario

// Mapeo de roles a nombres de departamento/área
function mapRolToDepartment(rol) {
    switch (rol) {
        case 1: return 'Administración';
        case 2: return 'Unidad de Género';
        case 3: return 'Tecnologías';
        case 4: return 'Secretaría';
        case 5: return 'Recursos Financieros';
        case 6: return 'Gestión Ambiental';
        default: return 'General';
    }
}

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
            // Exponer variables a las vistas
            if (res && res.locals) {
                res.locals.userName = user.name || user.username || 'Usuario';
                res.locals.userDepartment = mapRolToDepartment(user.rol);
            }
            return next();
        } catch (error) {
            return next();
        }
    } else {
        res.redirect('/login');
    }
};