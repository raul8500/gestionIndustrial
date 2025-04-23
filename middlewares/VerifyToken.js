const jwt = require('jsonwebtoken');
const { promisify } = require('util');

exports.verifyToken = (req, res, next) => {
    const token = req.cookies.jwt;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRETO);
      return next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        // Token expirado
        res.redirect('/login');
      } else {
        // Otro tipo de error
        console.error(err);
      }
    }
};