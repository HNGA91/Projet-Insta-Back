const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.MYSQL_DB, process.env.MYSQL_USER, process.env.MYSQL_PASSWORD, {
	host: process.env.MYSQL_HOST,
	port: process.env.MYSQL_PORT,
	dialect: "mysql",
	logging: false, // Désactive les logs SQL dans le terminal
	pool: {
		max: 10,
		min: 0,
		acquire: 30000,
		idle: 10000,
	},
});

// Test de connexion
sequelize
	.authenticate()
	.then(() => console.log("✅ Sequelize connecté à MySQL"))
	.catch((err) => console.error("❌ Erreur Sequelize:", err.message));

module.exports = sequelize;
