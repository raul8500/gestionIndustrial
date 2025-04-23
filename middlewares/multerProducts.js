const fs = require('fs');
const multer = require('multer');
const path = require('path');

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const carpetaDestino = path.join(__dirname, '../public/img/productos/');
    console.log('Destino esperado del archivo:', carpetaDestino);

    // Crear carpeta si no existe
    if (!fs.existsSync(carpetaDestino)) {
      console.log('La carpeta no existe. Creándola...');
      fs.mkdirSync(carpetaDestino, { recursive: true });
    }

    cb(null, carpetaDestino);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    console.log('Nombre del archivo generado:', uniqueSuffix);
    cb(null, uniqueSuffix);
  },
});

// Filtro de archivos: solo imágenes
const fileFilter = (req, file, cb) => {
  console.log('Validando archivo:', file.originalname);
  const allowedExtensions = /jpg|jpeg|png|gif|webp/;
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());

  if (extname) {
    console.log('Archivo de imagen válido.');
    cb(null, true);
  } else {
    console.log('Archivo de imagen no válido.');
    cb(new Error('Solo se permiten archivos de imagen: JPG, JPEG, PNG, GIF o WEBP.'));
  }
};

// Crear instancia de multer
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
