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
const solicitudesController = require('../controllers/transparencia/solicitudesController');
const inventarioController = require('../controllers/inventarioController/inventarioController');
const financierosController = require('../controllers/financieros/financierosController');
const financierosCorrespondenciaController = require('../controllers/financieros/correspondenciaController');
const gestionambientalController = require('../controllers/gestionambiental/gestionambientalController');
const empresasController = require('../controllers/gestionambiental/empresasController');
const tramitesController = require('../controllers/gestionambiental/tramitesController');
const tiposEmpresaController = require('../controllers/gestionambiental/tiposEmpresaController');
const tecnicosAmbientalesController = require('../controllers/gestionambiental/tecnicosAmbientalesController');
const calendarController = require('../controllers/calendarController/calendarController');
const migrationController = require('../controllers/tools/migrationController');


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

// Transparencia - Solicitudes (ruta corta)
router.get('/solicitudesInfo', authenticated.isAuthenticated, verifyToken.verifyToken, (req, res) => {    
    res.render('transparencia/solicitudes');
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

//Gestión Ambiental
router.get('/usuariosGestionAmbiental', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isGestionAmbiental, rolVerify.puedeCrearUsuarios,  (req, res) => {    
    res.render('gestionambiental/usuarios');
});

router.get('/empresas', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isGestionAmbiental,  (req, res) => {    
    res.render('gestionambiental/empresas');
});

router.get('/calendario', authenticated.isAuthenticated, verifyToken.verifyToken, (req, res) => {
    res.render('calendario/calendario');
});

// Trámites - Gestión Ambiental
router.get('/tramites', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isGestionAmbiental, (req, res) => {
    res.render('gestionambiental/tramites');
});

// Panel de configuraciones de Gestión Ambiental
router.get('/configuracionesGestionAmbiental', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isGestionAmbiental, (req, res) => {
    res.render('gestionambiental/configuraciones');
});

// Vista Tipos de Empresa (ruta canónica)
router.get('/gestionambientaltiposempresa', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isGestionAmbiental, (req, res) => {
    res.render('gestionambiental/tiposEmpresa');
});

// Vista Técnicos Ambientales
router.get('/gestionambientaltecnicosambientales', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isGestionAmbiental, (req, res) => {
    res.render('gestionambiental/tecnicosAmbientales');
});

// Vista Notificaciones (Trámites en Resguardo para notificar)
router.get('/notificacionTramite', authenticated.isAuthenticated, verifyToken.verifyToken, rolVerify.isGestionAmbiental, (req, res) => {
    res.render('gestionambiental/notificaciones');
});


//API
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

// Transparencia - API Solicitudes
router.get('/api/transparencia/solicitudes', verifyToken.verifyToken, solicitudesController.obtenerSolicitudes);
// Stats DEBE ir antes de ":id" para no ser capturada como id
router.get('/api/transparencia/solicitudes/stats', verifyToken.verifyToken, solicitudesController.obtenerStatsSolicitudes);
router.get('/api/transparencia/solicitudes/:id', verifyToken.verifyToken, solicitudesController.obtenerSolicitud);
router.post('/api/transparencia/solicitudes', verifyToken.verifyToken, upload.array('archivos', 10), solicitudesController.crearSolicitud);
router.put('/api/transparencia/solicitudes/:id', verifyToken.verifyToken, upload.array('archivos', 10), solicitudesController.actualizarSolicitud);
router.delete('/api/transparencia/solicitudes/:id', verifyToken.verifyToken, solicitudesController.eliminarSolicitud);
router.post('/api/transparencia/solicitudes/export', verifyToken.verifyToken, solicitudesController.exportarSolicitudes);
// Importar desde Excel a Solicitudes (Postman: form-data -> key "excel": File)
router.post('/api/transparencia/solicitudes/import-excel', upload.single('excel'), solicitudesController.importarSolicitudesDesdeExcel);


//Recursos financieros

router.get('/api/financieros/usuarios/', financierosController.obtenerUsuarios);
router.get('/api/financieros/usuarios/:id', financierosController.obtenerUsuarioPorId);
router.post('/api/financieros/usuarios/', financierosController.crearUsuario);
router.put('/api/financieros/usuarios/:id', financierosController.actualizarUsuario);
router.delete('/api/financieros/usuarios/:id', financierosController.eliminarUsuario);
router.put('/api/financieros/usuarios/password/:id', financierosController.actualizarPassword);

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
router.put('/api/gestionambiental/empresas/:id', empresasController.actualizarEmpresa);
router.delete('/api/gestionambiental/empresas/:id', empresasController.eliminarEmpresa);

// Gestión Ambiental - Tipos de Empresa (vista + API)
router.get('/api/gestionambiental/tipos-empresa', tiposEmpresaController.listarTipos);
router.post('/api/gestionambiental/tipos-empresa', tiposEmpresaController.crearTipo);
router.put('/api/gestionambiental/tipos-empresa/:id', tiposEmpresaController.actualizarTipo);
router.delete('/api/gestionambiental/tipos-empresa/:id', tiposEmpresaController.eliminarTipo);

// Gestión Ambiental - Técnicos Ambientales (API)
router.get('/api/gestionambiental/tecnicos-ambientales', tecnicosAmbientalesController.listar);
router.get('/api/gestionambiental/tecnicos-ambientales/:id', tecnicosAmbientalesController.obtenerPorId);
router.post('/api/gestionambiental/tecnicos-ambientales', tecnicosAmbientalesController.crear);
router.put('/api/gestionambiental/tecnicos-ambientales/:id', tecnicosAmbientalesController.actualizar);
router.delete('/api/gestionambiental/tecnicos-ambientales/:id', tecnicosAmbientalesController.eliminar);

// Gestión Ambiental - Trámites
router.get('/api/gestionambiental/tramites/', rolVerify.isGestionAmbiental, verifyToken.verifyToken, tramitesController.obtenerTramites);
router.get('/api/gestionambiental/tramites/opciones-filtros', rolVerify.isGestionAmbiental, verifyToken.verifyToken, tramitesController.obtenerOpcionesFiltros);
router.get('/api/gestionambiental/tramites/:id', rolVerify.isGestionAmbiental, verifyToken.verifyToken, tramitesController.obtenerTramitePorId);
router.post('/api/gestionambiental/tramites/', rolVerify.isGestionAmbiental, verifyToken.verifyToken, tramitesController.crearTramite);
router.put('/api/gestionambiental/tramites/:id', rolVerify.isGestionAmbiental, verifyToken.verifyToken, tramitesController.actualizarTramite);
router.delete('/api/gestionambiental/tramites/:id', rolVerify.isGestionAmbiental, verifyToken.verifyToken, tramitesController.eliminarTramite);
router.post('/api/gestionambiental/tramites/:id/lock', rolVerify.isGestionAmbiental, verifyToken.verifyToken, tramitesController.bloquearTramite);
router.post('/api/gestionambiental/tramites/:id/unlock', rolVerify.isGestionAmbiental, verifyToken.verifyToken, tramitesController.desbloquearTramite);
router.get('/api/gestionambiental/tramites/empresa/:empresaId', rolVerify.isGestionAmbiental, verifyToken.verifyToken, tramitesController.obtenerTramitesPorEmpresa);
router.get('/api/gestionambiental/tramites/status/:status', rolVerify.isGestionAmbiental, verifyToken.verifyToken, tramitesController.obtenerTramitesPorStatus);
router.get('/api/gestionambiental/tramites/buscar', rolVerify.isGestionAmbiental, verifyToken.verifyToken, tramitesController.buscarTramites);
router.get('/api/gestionambiental/tramites/estadisticas', rolVerify.isGestionAmbiental, verifyToken.verifyToken, tramitesController.obtenerEstadisticas);

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
// Herramientas / Migración
router.post('/api/tools/migrate/mysql-to-mongo',migrationController.migrateMySQLToMongo);



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

