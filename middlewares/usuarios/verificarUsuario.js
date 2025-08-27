const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const ModelUser = require('../../schemas/usersSchema/usersSchema');

async function verificarToken(req, res, next, rolesPermitidos) {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.redirect('/main');

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRETO);
    const user = await ModelUser.findById(decoded.id);

    if (!user || !rolesPermitidos.includes(user.rol)) {
      return res.redirect('/main'); // o res.status(403).send('Acceso denegado');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

// ✅ Solo Admin (rol 1)
exports.isAdmin = (req, res, next) => {
  verificarToken(req, res, next, [1]);
};

// ✅ Unidad de Género (rol 2) y Admin (1)
exports.isUnidad = (req, res, next) => {
  verificarToken(req, res, next, [1, 2]);
};

// ✅ Tecnologías (rol 3) y Admin (1)
exports.isTecnologias = (req, res, next) => {
  verificarToken(req, res, next, [1, 3]);
};

// ✅ Secretaría (rol 4) y Admin (1)
exports.isSecretaria = (req, res, next) => {
  verificarToken(req, res, next, [1, 4]);
};

// ✅ Financieros (rol 5) y Admin (1)
exports.isFinancieros = (req, res, next) => {
  verificarToken(req, res, next, [1, 5]);
};

// ✅ Gestión Ambiental (rol 6) y Admin (1)
exports.isGestionAmbiental = (req, res, next) => {
  verificarToken(req, res, next, [1, 6]);
};

// ✅ Financieros (5), Gestión Ambiental (6) y Admin (1) que además pueden crear usuarios
exports.puedeCrearUsuarios = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.redirect('/main?error=acceso');

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRETO);
    const user = await ModelUser.findById(decoded.id);

    const rolesPermitidos = [1, 5, 6];
    if (!user || !rolesPermitidos.includes(user.rol) || !user.puedeCrearUsuarios) {
      return res.redirect('/main?error=acceso');
    }

    req.user = user;
    next();
  } catch (error) {
    return res.redirect('/main?error=acceso');
  }
};
