const bcrypt = require('bcryptjs');
const Usuario = require('../../schemas/usersSchema/usersSchema');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './env/.env' });
const JWT_SECRET = process.env.JWT_SECRETO; // Cargado desde .env

// Obtener todos los usuarios (solo si área === 6)
exports.obtenerUsuarios = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);

    if (!usuario || (usuario.rol !== 1 && usuario.area !== 6)) {
      return res.status(403).json({ message: 'Acceso denegado. Área no autorizada.' });
    }

    const usuarios = await Usuario.find(
    { area: 6, puedeCrearUsuarios: false },
    'name username status'
    );

    res.json(usuarios);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

// Obtener un usuario por ID (solo si área === 6)
exports.obtenerUsuarioPorId = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);

    if (!usuario || (usuario.rol !== 1 && usuario.area !== 6)) {
      return res.status(403).json({ message: 'Acceso denegado. Área no autorizada.' });
    }

    const usuarioBuscado = await Usuario.findById(req.params.id);
    if (!usuarioBuscado) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json(usuarioBuscado);
  } catch (err) {
    res.status(500).json({ message: 'Error al buscar el usuario' });
  }
};

// Crear un nuevo usuario
exports.crearUsuario = async (req, res) => {
  try {
    const { name, username, password, status } = req.body;

    console.log(req.body)

    if (!name || !username || !password || typeof status === 'undefined') {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    const existe = await Usuario.findOne({ username });
    if (existe) {
      return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
    }

    const hash = await bcrypt.hash(password, 10);

    const nuevoUsuario = new Usuario({
      name,
      username,
      password: hash,
      status,
      rol: 6,
      area: 6, // área fija para gestión ambiental
      puedeCrearUsuarios: false // no puede crear usuarios
    });

    await nuevoUsuario.save();
    res.status(201).json({ message: 'Usuario creado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear usuario' });
  }
};

// Actualizar un usuario existente
exports.actualizarUsuario = async (req, res) => {
  try {
    const { name, username, password, status } = req.body;

    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });

    usuario.name = name || usuario.name;
    usuario.username = username || usuario.username;
    usuario.status = typeof status !== 'undefined' ? status : usuario.status;

    // Solo actualiza la contraseña si se envió
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      usuario.password = hash;
    }

    await usuario.save();
    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar usuario' });
  }
};

// Eliminar un usuario
exports.eliminarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndDelete(req.params.id);
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
};

exports.actualizarPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    await Usuario.findByIdAndUpdate(req.params.id, { password: hash });
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar la contraseña' });
  }
};
