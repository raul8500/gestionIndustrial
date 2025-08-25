const express = require('express')
const router = express.Router()


//imports Middlewares
const authenticated = require('../middlewares/Authenticated')
const verifyToken = require('../middlewares/VerifyToken')
const auth = require('../controllers/auth/auth')
const logout = require('../middlewares/Logout') 
const verifySesion = require('../middlewares/VerifySesion') 
const adminVerify = require('../middlewares/AdminVerify')
const rolVerify = require('../middlewares/usuarios/verificarUsuario')


//Controllers
const userFunctions = require('../controllers/functionsUsers/userFunctions')
const upload = require('../middlewares/uploads');
const oficioController = require('../controllers/oficiosController/oficiosController');
const ticketsController = require('../controllers/ticketsController/ticketsController');
const correspondenciaController = require('../controllers/correspondenciaSecretaria/correspondenciaController');
const inventarioController = require('../controllers/inventarioController/inventarioController');
const financierosController = require('../controllers/financieros/financierosController');
const financierosCorrespondenciaController = require('../controllers/financieros/correspondenciaController');
const calendarController = require('../controllers/calendarController/calendarController');


//Vistas generales
router.get('/login', (req, res) => {    
    res.render('login', { hideHeader: true });
});

router.get('/main', authenticated.isAuthenticated, verifyToken.verifyToken,  (req, res) => {    
    res.render('main');
});

//UA
router.get('/registros', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isUnidad,  (req, res) => {    
    res.render('oficios/oficiosRegistros');
});

//Tics
router.get('/tickets', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isTecnologias,  (req, res) => {    
    res.render('tickets/tickets');
});

router.get('/usuarios', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isAdmin,  (req, res) => {    
    res.render('usuarios/usuarios');
});

router.get('/inventarioTics', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isTecnologias,  (req, res) => {    
    res.render('inventariotics/inventarioTics');
});

//Area de la secretaria
router.get('/correspondenciaSecretaria', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isSecretaria,  (req, res) => {    
    res.render('secretaria/correspondencia');
});


//Recursos financieros
router.get('/usuariosFinancieros', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isFinancieros, rolVerify.puedeCrearUsuarios,  (req, res) => {    
    res.render('financieros/usuarios');
});

router.get('/correspondenciaFinancieros', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isFinancieros,   (req, res) => {    
    res.render('financieros/correspondencia');
});

router.get('/controlViaticos', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isFinancieros,  (req, res) => {    
    res.render('financieros/viaticos');
});

router.get('/calendario', authenticated.isAuthenticated, verifyToken.verifyToken, (req, res) => {
    res.render('calendario/calendario');
});




//API
//Funciones al API
router.post('/api/auth/register', rolVerify.isAdmin, auth.registerUser)
router.post('/api/auth/login', auth.login)
//Auth
router.put('/api/auth/users/passwords/:id', rolVerify.isAdmin, auth.updatePassword)
router.get('/api/auth/users', rolVerify.isAdmin, auth.getAllUsers)
router.get('/api/auth/users/:id', rolVerify.isAdmin, auth.getUserById)
router.get('/api/auth/users/:id', rolVerify.isAdmin, auth.getUserById)
router.put('/api/auth/users/:id', rolVerify.isAdmin, auth.updateUserById)
router.delete('/api/auth/users/:id', rolVerify.isAdmin, auth.deleteUserById);
router.put('/api/auth/users/status/:id', rolVerify.isAdmin, auth.updateUserStatus)
router.get('/logout', logout.logout)


//MiddleWare
router.get('/api/verifySesion', verifySesion.verifyToken)


//Usuarios
router.post('/api/auth/functions/add',  userFunctions.addFunction)
router.get('/api/auth/functions/:nameRol', userFunctions.getFunctionsByRole)
router.get('/api/functions', userFunctions.getAllFunctions)
router.put('/api/auth/functions/:id', userFunctions.updateFunctionById)


//oficios rutas

router.post('/api/createOficio/', rolVerify.isUnidad, verifyToken.verifyToken, upload.array('archivos',10), oficioController.createOficio);
router.put('/api/updateOficio/:id', rolVerify.isUnidad, verifyToken.verifyToken, upload.array('archivos',10), oficioController.updateOficio);
router.get('/api/oficios', rolVerify.isUnidad, verifyToken.verifyToken, oficioController.getAllOficios);
router.get('/api/oficios/stats', rolVerify.isUnidad, verifyToken.verifyToken, oficioController.getOficiosStats);
router.get('/api/getOficio/:id', rolVerify.isUnidad, verifyToken.verifyToken, oficioController.getOficioById);
router.delete('/api/deleteOficio/:id', rolVerify.isUnidad, verifyToken.verifyToken, oficioController.deleteOficio);
router.post('/api/oficios/export', rolVerify.isUnidad, verifyToken.verifyToken, oficioController.exportOficios);



// Tickets Tics

router.post('/api/tickets/', rolVerify.isTecnologias, verifyToken.verifyToken,  ticketsController.crearTicket);
router.get('/api/tickets/', rolVerify.isTecnologias, verifyToken.verifyToken, ticketsController.obtenerTickets);
router.get('/api/tickets/:id', rolVerify.isTecnologias, verifyToken.verifyToken,  ticketsController.obtenerTicket);
router.put('/api/tickets/:id', rolVerify.isTecnologias, verifyToken.verifyToken, ticketsController.actualizarTicket);
router.delete('/api/tickets/:id', rolVerify.isTecnologias, verifyToken.verifyToken,  ticketsController.eliminarTicket);
router.get('/api/tickets/reporte/:fechaInicio/:fechaFin', rolVerify.isTecnologias, verifyToken.verifyToken,  ticketsController.generarReporte);


router.post('/api/inventario/', rolVerify.isTecnologias, verifyToken.verifyToken, inventarioController.crearInventario);
router.get('/api/inventario/', rolVerify.isTecnologias, verifyToken.verifyToken, inventarioController.obtenerInventario);
router.get('/api/inventario/:id', rolVerify.isTecnologias, verifyToken.verifyToken, inventarioController.obtenerPorId);
router.put('/api/inventario/:id', rolVerify.isTecnologias, verifyToken.verifyToken, inventarioController.actualizarInventario);
router.delete('/api/inventario/:id', rolVerify.isTecnologias, verifyToken.verifyToken, inventarioController.eliminarInventario);


//Correspondencia

router.post('/api/correspondencia/', rolVerify.isSecretaria, verifyToken.verifyToken, upload.array('archivos', 10), correspondenciaController.crearCorrespondencia);
router.get('/api/correspondencia/', rolVerify.isSecretaria, verifyToken.verifyToken, correspondenciaController.obtenerCorrespondencias);
router.get('/api/correspondencia/:id', rolVerify.isSecretaria, verifyToken.verifyToken, correspondenciaController.obtenerCorrespondencia);
router.put('/api/correspondencia/:id', rolVerify.isSecretaria, verifyToken.verifyToken, upload.array('archivos', 10), correspondenciaController.actualizarCorrespondencia);
router.delete('/api/correspondencia/:id', rolVerify.isSecretaria, verifyToken.verifyToken, correspondenciaController.eliminarCorrespondencia);


//Recursos financieros

router.get('/api/financieros/usuarios/', financierosController.obtenerUsuarios);
router.get('/api/financieros/usuarios/:id', financierosController.obtenerUsuarioPorId);
router.post('/api/financieros/usuarios/', financierosController.crearUsuario);
router.put('/api/financieros/usuarios/:id', financierosController.actualizarUsuario);
router.delete('/api/financieros/usuarios/:id', financierosController.eliminarUsuario);
router.put('/api/financieros/usuarios/password/:id', financierosController.actualizarPassword);

router.get('/api/financieros/correspondencia/', verificarToken, financierosCorrespondenciaController.obtenerCorrespondencias);
router.get('/api/financieros/correspondencia/:id', financierosCorrespondenciaController.obtenerCorrespondenciaPorId);
router.post('/api/financieros/correspondencia/', upload.array('archivos', 10), financierosCorrespondenciaController.crearCorrespondencia);
router.put('/api/financieros/correspondencia/:id', upload.array('archivos', 10), financierosCorrespondenciaController.actualizarCorrespondencia);
router.delete('/api/financieros/correspondencia/:id', financierosCorrespondenciaController.eliminarCorrespondencia);
router.get('/api/financieros/correspondencia/respaldo/:id', financierosCorrespondenciaController.respaldoCorrespondencia);
router.post('/api/financieros/correspondencia/enviar-revision/:id', financierosCorrespondenciaController.enviarARevision);



//calendario de salidas (FullCalendar)

router.get('/calendario/salidas', verificarToken, calendarController.getSalidas); // Obtener todas las salidas (eventos)
router.post('/calendario/salidas', verificarToken, calendarController.createSalida); // Crear nueva salida
router.get('/calendario/salidas/:id', verificarToken, calendarController.getSalidaById); // Ver salida por ID
router.put('/calendario/salidas/:id', verificarToken, calendarController.updateSalida); // Actualizar salida
router.delete('/calendario/salidas/:id', verificarToken, calendarController.deleteSalida); // Eliminar salida solo si el usuario la creó
router.patch('/calendario/salidas/:id/estado', verificarToken, calendarController.cambiarEstadoSalida); // Cambiar estado de salida
router.get('/calendario/test-fechas', verificarToken, calendarController.testFechas); // Endpoint de prueba para fechas



const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  const token = req.cookies.jwt;
  if (!token) return res.status(401).json({ message: 'Sin token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRETO);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Error al verificar token:', err);
    return res.status(403).json({ message: 'Token inválido' });
  }
}

router.use((req, res, next) => {
    res.status(404).render('404', {
        title: 'Página no encontrada',
        message: 'Lo sentimos, la página que buscas no existe.'
    });
});

module.exports = router

