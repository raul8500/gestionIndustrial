const mongoose = require('mongoose');

const dbconnect = async () => {
    try {
        await mongoose.connect("mongodb://ua:123@85.31.224.165:27017/ua", {
            
        });
        console.log('✅ Conexión correcta');
    } catch (err) {
        console.error('Error al conectarse a la BD', err);
    }
};

module.exports = dbconnect;
