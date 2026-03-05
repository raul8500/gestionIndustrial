const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/archivos/'); // carpeta destino
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = /pdf|docx|doc|jpg|jpeg|png|csv|xls|xlsx/;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.test(ext));
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
