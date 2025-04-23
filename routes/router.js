const express = require('express')
const router = express.Router()


//imports
const authenticated = require('../middlewares/Authenticated')
const verifyToken = require('../middlewares/VerifyToken')
const auth = require('../controllers/auth/auth')
const logout = require('../middlewares/Logout') 
const verifySesion = require('../middlewares/VerifySesion') 
const adminVerify = require('../middlewares/AdminVerify') 
const userFunctions = require('../controllers/functionsUsers/userFunctions')
const upload = require('../middlewares/uploads');
const oficioController = require('../controllers/oficiosController/oficiosController');


//Vistas
router.get('/login', (req, res) => {    
    res.render('login', { hideHeader: true });
});

router.get('/main', authenticated.isAuthenticated, verifyToken.verifyToken, (req, res) => {    
    res.render('main');
});

router.get('/registros', authenticated.isAuthenticated, verifyToken.verifyToken, (req, res) => {    
    res.render('oficios/oficiosRegistros');
});




//API
//Funciones al API
router.post('/api/auth/register', auth.registerUser)
router.post('/api/auth/login', auth.login)
//Auth
router.put('/api/auth/users/passwords/:id', auth.updatePassword)
router.get('/api/auth/users', auth.getAllUsers)
router.get('/api/auth/users/:id', auth.getUserById)
router.get('/api/auth/users/:id', auth.getUserById)
router.put('/api/auth/users/:id', auth.updateUserById)
router.delete('/api/auth/users/:id', auth.deleteUserById);
router.put('/api/auth/users/status/:id', auth.updateUserStatus)
router.get('/logout', logout.logout)



//MiddleWare
router.get('/api/verifySesion', verifySesion.verifyToken)
router.get('/api/isAdmin', adminVerify.isAdminVerify)


//Usuarios
router.post('/api/auth/functions/add', userFunctions.addFunction)
router.get('/api/auth/functions/:nameRol', userFunctions.getFunctionsByRole)
router.get('/api/functions', userFunctions.getAllFunctions)
router.put('/api/auth/functions/:id', userFunctions.updateFunctionById)


//oficios rutas

router.post('/api/createOficio/', upload.array('archivos',10), oficioController.createOficio);
router.put('/api/updateOficio/:id', upload.array('archivos',10), oficioController.updateOficio);
router.get('/api/getOficios', oficioController.getAllOficios);
router.get('/api/getOficio/:id', oficioController.getOficioById);
router.delete('/api/deleteOficio/:id', oficioController.deleteOficio);



router.use((req, res, next) => {
    res.status(404).render('404', {
        title: 'Página no encontrada',
        message: 'Lo sentimos, la página que buscas no existe.'
    });
});

module.exports = router

