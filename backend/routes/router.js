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
const gestionambientalController = require('../controllers/gestionambiental/gestionambientalController');
const empresasController = require('../controllers/gestionambiental/empresasController');
const tramitesController = require('../controllers/gestionambiental/tramitesController');
const tecnicosAmbientalesController = require('../controllers/gestionambiental/tecnicosAmbientalesController');
const sectoresController = require('../controllers/gestionambiental/sectoresController');
const actividadesEconomicasController = require('../controllers/gestionambiental/actividadesEconomicasController');
//Vistas generales
router.get('/login', (req, res) => {    
    res.render('login', { hideHeader: true });
});

router.get('/main', authenticated.isAuthenticated, verifyToken.verifyToken,  (req, res) => {    
    res.render('main');
});

//UA
router.get('/registros', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isSupervisor,  (req, res) => {    
    res.render('oficios/oficiosRegistros');
});

//Tics
router.get('/tickets', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isSupervisor,  (req, res) => {    
    res.render('tickets/tickets');
});

router.get('/usuarios', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isAdmin,  (req, res) => {    
    res.render('usuarios/usuarios');
});

router.get('/inventarioTics', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isSupervisor,  (req, res) => {    
    res.render('inventariotics/inventarioTics');
});

//Area de la secretaria
router.get('/correspondenciaSecretaria', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isOficialia,  (req, res) => {    
    res.render('secretaria/correspondencia');
});

// Transparencia - Solicitudes (ruta corta)
router.get('/solicitudesInfo', authenticated.isAuthenticated, verifyToken.verifyToken, (req, res) => {    
    res.render('transparencia/solicitudes');
});


//Recursos financieros
router.get('/usuariosFinancieros', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isTramites, rolVerify.puedeCrearUsuarios,  (req, res) => {    
    res.render('financieros/usuarios');
});

router.get('/correspondenciaFinancieros', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isTramites,   (req, res) => {    
    res.render('financieros/correspondencia');
});

router.get('/controlViaticos', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isTramites,  (req, res) => {    
    res.render('financieros/viaticos');
});

//Gestión Ambiental
router.get('/usuariosGestionAmbiental', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isNotificaciones, rolVerify.puedeCrearUsuarios,  (req, res) => {    
    res.render('gestionambiental/usuarios');
});

router.get('/empresas', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isNotificaciones,  (req, res) => {    
    res.render('gestionambiental/empresas');
});

router.get('/calendario', authenticated.isAuthenticated, verifyToken.verifyToken, (req, res) => {
    res.render('calendario/calendario');
});

// Trámites - Gestión Ambiental
router.get('/tramites', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isTramites, (req, res) => {
    res.render('gestionambiental/tramites');
});

// Panel de configuraciones de Gestión Ambiental
router.get('/configuracionesGestionAmbiental', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isAdmin, (req, res) => {
    res.render('gestionambiental/configuraciones');
});

// Vista Sectores
router.get('/gestionambientalsectores', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isAdmin, (req, res) => {
    res.render('gestionambiental/sectores');
});

// Vista Actividades Económicas
router.get('/gestionambientalactividadeseconomicas', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isAdmin, (req, res) => {
    res.render('gestionambiental/actividadesEconomicas');
});

// Vista Técnicos Ambientales
router.get('/gestionambientaltecnicosambientales', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isAdmin, (req, res) => {
    res.render('gestionambiental/tecnicosAmbientales');
});

// Vista Notificaciones (Trámites en Resguardo para notificar)
router.get('/notificacionTramite', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isNotificaciones, (req, res) => {
    res.render('gestionambiental/notificaciones');
});


//API
router.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'backend',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

//Funciones al API
router.post('/api/auth/register', auth.registerUser)
router.post('/api/auth/login', auth.login)
//Auth
router.put('/api/auth/users/passwords/:id', rolVerify.isAdmin, auth.updatePassword)
router.get('/api/auth/users', auth.getAllUsers)
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


// Gestión Ambiental - Usuarios
router.get('/api/gestionambiental/usuarios/', gestionambientalController.obtenerUsuarios);
router.get('/api/gestionambiental/usuarios/:id', gestionambientalController.obtenerUsuarioPorId);
router.post('/api/gestionambiental/usuarios/', gestionambientalController.crearUsuario);
router.put('/api/gestionambiental/usuarios/:id', gestionambientalController.actualizarUsuario);
router.delete('/api/gestionambiental/usuarios/:id', gestionambientalController.eliminarUsuario);
router.put('/api/gestionambiental/usuarios/password/:id', gestionambientalController.actualizarPassword);

// Gestión Ambiental - Empresas
router.get('/api/gestionambiental/empresas/', empresasController.obtenerEmpresas);
router.get('/api/gestionambiental/empresas/buscar', empresasController.buscarEmpresas);
router.get('/api/gestionambiental/empresas/estadisticas', empresasController.obtenerEstadisticas);
router.get('/api/gestionambiental/empresas/ver/:id', empresasController.verEmpresa);
router.get('/api/gestionambiental/empresas/:id', empresasController.obtenerEmpresaPorId);
router.post('/api/gestionambiental/empresas/', empresasController.crearEmpresa);
router.post('/api/gestionambiental/empresas/:id/lock', empresasController.bloquearEmpresa);
router.post('/api/gestionambiental/empresas/:id/unlock', empresasController.desbloquearEmpresa);
router.put('/api/gestionambiental/empresas/:id', empresasController.actualizarEmpresa);
router.delete('/api/gestionambiental/empresas/:id', empresasController.eliminarEmpresa);

// Gestión Ambiental - Sectores (API)
router.get('/api/gestionambiental/sectores', sectoresController.listar);
router.post('/api/gestionambiental/sectores', sectoresController.crear);
router.put('/api/gestionambiental/sectores/:id', sectoresController.actualizar);
router.delete('/api/gestionambiental/sectores/:id', sectoresController.eliminar);

// Gestión Ambiental - Actividades Económicas (API)
router.get('/api/gestionambiental/actividades-economicas', actividadesEconomicasController.listar);
router.post('/api/gestionambiental/actividades-economicas', actividadesEconomicasController.crear);
router.put('/api/gestionambiental/actividades-economicas/:id', actividadesEconomicasController.actualizar);
router.delete('/api/gestionambiental/actividades-economicas/:id', actividadesEconomicasController.eliminar);

// Gestión Ambiental - Técnicos Ambientales (API)
router.get('/api/gestionambiental/tecnicos-ambientales', tecnicosAmbientalesController.listar);
router.get('/api/gestionambiental/tecnicos-ambientales/:id', tecnicosAmbientalesController.obtenerPorId);
router.post('/api/gestionambiental/tecnicos-ambientales', tecnicosAmbientalesController.crear);
router.put('/api/gestionambiental/tecnicos-ambientales/:id', tecnicosAmbientalesController.actualizar);
router.delete('/api/gestionambiental/tecnicos-ambientales/:id', tecnicosAmbientalesController.eliminar);

// Gestión Ambiental - Trámites
router.get('/api/gestionambiental/tramites/', authenticated.isAuthenticated, verifyToken.verifyToken, tramitesController.obtenerTramites);
router.get('/api/gestionambiental/tramites/opciones-filtros', authenticated.isAuthenticated, verifyToken.verifyToken, tramitesController.obtenerOpcionesFiltros);
router.get('/api/gestionambiental/tramites/:id', authenticated.isAuthenticated, verifyToken.verifyToken, tramitesController.obtenerTramitePorId);
router.post('/api/gestionambiental/tramites/', authenticated.isAuthenticated, verifyToken.verifyToken, tramitesController.crearTramite);
router.put('/api/gestionambiental/tramites/:id', authenticated.isAuthenticated, verifyToken.verifyToken, tramitesController.actualizarTramite);
router.delete('/api/gestionambiental/tramites/:id', authenticated.isAuthenticated, verifyToken.verifyToken, tramitesController.eliminarTramite);
router.post('/api/gestionambiental/tramites/:id/lock', authenticated.isAuthenticated, verifyToken.verifyToken, tramitesController.bloquearTramite);
router.post('/api/gestionambiental/tramites/:id/unlock', authenticated.isAuthenticated, verifyToken.verifyToken, tramitesController.desbloquearTramite);
router.get('/api/gestionambiental/tramites/empresa/:empresaId', authenticated.isAuthenticated, verifyToken.verifyToken, tramitesController.obtenerTramitesPorEmpresa);
router.get('/api/gestionambiental/tramites/status/:status', authenticated.isAuthenticated, verifyToken.verifyToken, tramitesController.obtenerTramitesPorStatus);
router.get('/api/gestionambiental/tramites/buscar', authenticated.isAuthenticated, verifyToken.verifyToken, tramitesController.buscarTramites);
router.get('/api/gestionambiental/tramites/estadisticas', authenticated.isAuthenticated, verifyToken.verifyToken, tramitesController.obtenerEstadisticas);



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

