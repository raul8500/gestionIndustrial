const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const dbconnect = require('./database/mongoDB');
const cookieParser = require('cookie-parser');
const http = require('http');
const jwt = require('jsonwebtoken');
const path = require('path')
const expressLayouts = require('express-ejs-layouts');

//const fileUpload = require('express-fileupload')

//no se 
// Conectar a la base de datos
dbconnect();
const app = express();

// Crear el servidor HTTP
let server = http.createServer(app);

// Configurar los encabezados CORS para permitir solicitudes desde un origen específico
app.use(cors());

// Seteamos el motor de plantillas
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Seteamos la carpeta public para archivos estáticos
app.use(express.static('public'));
//app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(expressLayouts);
app.set('layout', 'layout/base'); // Define el layout base

// Para procesar datos enviados desde forms
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Seteamos las variables de entorno
dotenv.config({ path: './env/.env' });

// Para poder trabajar con las cookies
app.use(cookieParser());

// Llamar al router
app.use('/', require('./routes/router'));

// Para eliminar la cache
app.use(function (req, res, next) {
    if (!req.user)
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    next();
});


// Manejar errores globales en el servidor
server.on('error', (err) => {
    if (err.code === 'ECONNRESET') {
        console.warn('⚠️ Conexión reseteada por el cliente. Ignorando y continuando...');
    } else {
        console.error('🔥 Error en el servidor:', err);
    }
});

// Capturar errores en solicitudes individuales
app.use((err, req, res, next) => {
    if (err.code === 'ECONNRESET') {
        console.warn('⚠️ Error ECONNRESET en la solicitud.');
        res.status(500).send('Error interno del servidor. Intenta de nuevo.');
    } else {
        console.error('🔥 Error inesperado:', err);
        res.status(500).send('Error interno del servidor.');
    }
});

// Reiniciar conexiones fallidas automáticamente
function restartServer() {
    console.warn('🔄 Reiniciando servidor...');
    server.close(() => {
        server = http.createServer(app);
        server.listen(3000, () => console.log('✅ Servidor reiniciado correctamente'));
    });
}

// Capturar errores críticos
process.on('uncaughtException', (err) => {
    console.error('🚨 Excepción no controlada:', err);
    restartServer();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Promesa no manejada:', reason);
    restartServer();
});

// Iniciar el servidor
server.listen(3000, () => {
    console.log('🚀 Servidor corriendo en el puerto 3000');
});


// BACKUP AUTOMÁTICO DE MONGODB
const { exec } = require('child_process');
const cron = require('node-cron');
const fs = require('fs');

const dbName = 'ua'; // nombre de tu base de datos
const backupDir = path.join(__dirname, 'backups'); // carpeta para respaldos

// Ruta completa a mongodump.exe
const mongodumpPath = 'C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongodump.exe'; // <-- AJUSTA según tu instalación

// Crear la carpeta si no existe
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Programar respaldo diario a las 10:43 AM (hora local de Windows Server)
cron.schedule('43 10 * * *', () => {
  const fecha = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `backup-${fecha}`);
  
  const cmd = `"${mongodumpPath}" --db=${dbName} --out="${backupPath}"`;

  console.log(`[${new Date().toLocaleString()}] Iniciando respaldo de MongoDB...`);

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error al respaldar la base de datos: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`⚠️ stderr: ${stderr}`);
      return;
    }
    console.log(`✅ Respaldo completado en: ${backupPath}`);
  });
});

