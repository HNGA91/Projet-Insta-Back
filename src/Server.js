require("dotenv").config();

//src/Server.js
const app = require("./ExpressApp");
const connectDB = require("./DB");
const pool = require("./DBMySQL");

connectDB();

app.listen(3000, () => {
	console.log("📊 Serveur démarré sur le port 3000");
});