// On charge les variables d'environnement avant tous les tests
// car Jest n'utilise pas dotenvx comme nodemon
require("dotenv").config();

module.exports = {
	// Environnement Node (pas de DOM, c'est un backend)
	testEnvironment: "node",

	// Fichier exécuté après la mise en place de l'environnement de test
	// mais avant que les tests ne commencent
	setupFilesAfterEnv: ["./src/Tests/setup.js"],

	// Timeout plus long que la valeur par défaut (5s)
	// car les tests touchent une vraie base de données
	testTimeout: 10000,
};
