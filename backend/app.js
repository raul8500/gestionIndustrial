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

// Agrega socket.io
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: "*", // Puedes restringir a un dominio específico si gustas
    methods: ["GET", "POST"]
  }
});

// Exporta `io` para usarlo en tus controladores o en otro módulo
app.set('io', io);

// Manejo de conexión de WebSocket
io.on('connection', (socket) => {
  console.log('✅ Cliente conectado:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });
});

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

// BACKUP AUTOMÁTICO DE MONGODB EN JSON
const { exec } = require('child_process');
const cron = require('node-cron');
const fs = require('fs');
const { MongoClient } = require('mongodb');

// Configuraciones
const dbName = 'ua';
const mongoUri = 'mongodb://localhost:27017';
const mongoBinPath = 'C:\\Program Files\\MongoDB\\Server\\7.0\\bin'; // Ajusta según tu instalación
const backupDir = path.join(__dirname, 'backups');

// Crear carpeta si no existe
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Programar respaldo diario a las 17:38
cron.schedule('44 17 * * *', async () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dailyBackupDir = path.join(backupDir, `json-backup-${timestamp}`);
  fs.mkdirSync(dailyBackupDir, { recursive: true });

  console.log(`[${new Date().toLocaleString()}] Iniciando respaldo en JSON...`);

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();

    if (!collections.length) {
      console.log('⚠️ No se encontraron colecciones.');
      return;
    }

    collections.forEach(({ name }) => {
      const exportCmd = `"${mongoBinPath}\\mongoexport.exe" --uri="${mongoUri}" --db=${dbName} --collection=${name} --out="${path.join(dailyBackupDir, `${name}.json`)}" --jsonArray`;

      exec(exportCmd, (error, stdout, stderr) => {
        if (error || stderr) {
          console.error(`❌ Error exportando ${name}:`, error || stderr);
        } else {
          console.log(`✅ Colección exportada: ${name}`);
        }
      });
    });

  } catch (err) {
    console.error('❌ Error al conectar a MongoDB:', err);
  } finally {
    await client.close();
  }
});

