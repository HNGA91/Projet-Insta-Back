// Permet d'importer la bibliothèque
const mongoose = require('mongoose');

// Connection ) la base de donnée
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/InstaDB');
        console.log("✅ Connecté à MongoDB");
    } catch (err) {
        console.error("❌ Erreur MongoDB:", err);
    }
};

module.exports = connectDB;