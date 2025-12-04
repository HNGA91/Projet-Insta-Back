// Permet d'importer la bibliothèque
const mongoose = require('mongoose');

// Connection ) la base de donnée
const connectDB = async () => {
    try {
		// Prend l'URL depuis les variables d'environnement et se connecte à MongoDB
		await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/InstaDB", {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		console.log("✅ Connecté à MongoDB");
	} catch (err) {
		console.error("❌ Erreur MongoDB:", err);
		process.exit(1); // Arrête l'application si échec de connexion
	}
};

module.exports = connectDB;