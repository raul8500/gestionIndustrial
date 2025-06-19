const mongoose = require('mongoose');

const dbconnect = async () => {
    try {
        await mongoose.connect("mongodb://ua:uaxt914914yy_@31.97.132.110:27017/ua", {
            
        });
        console.log('✅ Conexión correcta');
    } catch (err) {
        console.error('Error al conectarse a la BD', err);
    }
};

module.exports = dbconnect;
