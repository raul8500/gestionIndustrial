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