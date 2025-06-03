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

router.post('/api/createOficio/', rolVerify.isUnidad, upload.array('archivos',10), oficioController.createOficio);
router.put('/api/updateOficio/:id', rolVerify.isUnidad,  upload.array('archivos',10), oficioController.updateOficio);
router.get('/api/getOficios', rolVerify.isUnidad,  oficioController.getAllOficios);
router.get('/api/getOficio/:id', rolVerify.isUnidad, oficioController.getOficioById);
router.delete('/api/deleteOficio/:id', rolVerify.isUnidad, oficioController.deleteOficio);



// Tickets Tics

router.post('/api/tickets/', rolVerify.isTecnologias,  ticketsController.crearTicket);
router.get('/api/tickets/', rolVerify.isTecnologias, ticketsController.obtenerTickets);
router.get('/api/tickets/:id', rolVerify.isTecnologias,  ticketsController.obtenerTicket);
router.put('/api/tickets/:id', rolVerify.isTecnologias,  ticketsController.actualizarTicket);
router.delete('/api/tickets/:id', rolVerify.isTecnologias,  ticketsController.eliminarTicket);
router.get('/api/tickets/reporte/:fechaInicio/:fechaFin', rolVerify.isTecnologias,  ticketsController.generarReporte);


router.post('/api/inventario/', rolVerify.isTecnologias, inventarioController.crearInventario);
router.get('/api/inventario/', rolVerify.isTecnologias, inventarioController.obtenerInventario);
router.get('/api/inventario/:id', rolVerify.isTecnologias, inventarioController.obtenerPorId);
router.put('/api/inventario/:id', rolVerify.isTecnologias, inventarioController.actualizarInventario);
router.delete('/api/inventario/:id', rolVerify.isTecnologias, inventarioController.eliminarInventario);


//Correspondencia

router.post('/api/correspondencia/', rolVerify.isSecretaria, upload.array('archivos', 10), correspondenciaController.crearCorrespondencia);
router.get('/api/correspondencia/', rolVerify.isSecretaria, correspondenciaController.obtenerCorrespondencias);
router.get('/api/correspondencia/:id', rolVerify.isSecretaria, correspondenciaController.obtenerCorrespondencia);
router.put('/api/correspondencia/:id', rolVerify.isSecretaria, upload.array('archivos', 10), correspondenciaController.actualizarCorrespondencia);
router.delete('/api/correspondencia/:id', rolVerify.isSecretaria, correspondenciaController.eliminarCorrespondencia);




router.use((req, res, next) => {
    res.status(404).render('404', {
        title: 'Página no encontrada',
        message: 'Lo sentimos, la página que buscas no existe.'
    });
});

module.exports = router

