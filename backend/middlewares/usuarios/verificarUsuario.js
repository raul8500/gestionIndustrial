const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const ModelUser = require('../../schemas/usersSchema/usersSchema');

function mapRolToDepartment(rol) {
  switch (rol) {
    case 1: return 'Administración';
    case 2: return 'Supervisor';
    case 3: return 'Oficialía';
    case 4: return 'Trámites';
    case 5: return 'Notificaciones';
    default: return 'General';
  }
}

async function verificarToken(req, res, next, rolesPermitidos) {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.redirect('/main');

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRETO);
    const user = await ModelUser.findById(decoded.id);

    if (!user || !rolesPermitidos.includes(user.rol)) {
      return res.redirect('/main');
    }

    req.user = user;
    if (res && res.locals) {
      res.locals.userName = user.name || user.username || 'Usuario';
      res.locals.userDepartment = mapRolToDepartment(user.rol);
    }
    next();
  } catch (error) {
    next(error);
  }
}

// ✅ Solo Admin (rol 1)
exports.isAdmin = (req, res, next) => {
  verificarToken(req, res, next, [1]);
};

// ✅ Supervisor (rol 2) y Admin (1)
exports.isSupervisor = (req, res, next) => {
  verificarToken(req, res, next, [1, 2]);
};

// ✅ Oficialía (rol 3) y Admin (1)
exports.isOficialia = (req, res, next) => {
  verificarToken(req, res, next, [1, 3]);
};

// ✅ Trámites (rol 4) y Admin (1)
exports.isTramites = (req, res, next) => {
  verificarToken(req, res, next, [1, 4]);
};

// ✅ Notificaciones (rol 5) y Admin (1)
exports.isNotificaciones = (req, res, next) => {
  verificarToken(req, res, next, [1, 5]);
};

// ✅ Admin (1) que además pueden crear usuarios
exports.puedeCrearUsuarios = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.redirect('/main?error=acceso');

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRETO);
    const user = await ModelUser.findById(decoded.id);

    const rolesPermitidos = [1];
    if (!user || !rolesPermitidos.includes(user.rol) || !user.puedeCrearUsuarios) {
      return res.redirect('/main?error=acceso');
    }

    req.user = user;
    next();
  } catch (error) {
    return res.redirect('/main?error=acceso');
  }
};
