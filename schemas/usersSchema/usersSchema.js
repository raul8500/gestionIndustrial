const mongoose = require('mongoose');

const userModel = new mongoose.Schema(
    {
        name: {
            type: String
        },
        username: {
            type: String
        },
        rol: {
            type: Number
        },
        password: {
            type: String
        },
        status: {
            type: Number
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const ModelUser = mongoose.model("users", userModel);
module.exports = ModelUser;
