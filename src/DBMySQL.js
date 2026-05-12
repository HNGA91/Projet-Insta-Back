const mysql = require("mysql2/promise");

const pool = mysql.createPool({
	host: process.env.MYSQL_HOST,
	port: process.env.MYSQL_PORT,
	user: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_DB,
	waitForConnections: true,
	connectionLimit: 10,
});

pool.query("SELECT 1")
	.then(() => console.log("✅ Connecté à MySQL"))
	.catch((err) => console.error("❌ Erreur MySQL :", err.message));

module.exports = pool;
