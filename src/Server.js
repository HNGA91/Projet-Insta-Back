require("dotenv").config();

const fs = require("fs");
const https = require("https");
const app = require("./ExpressApp");
const connectDB = require("./MongoDB");
require("./SequelizeDB");

// Chargement des certificats SSL générés par mkcert
const sslOptions = {
	key: fs.readFileSync("localhost-key.pem"),
	cert: fs.readFileSync("localhost.pem"),
};

connectDB();

// Démarrage du serveur en HTTPS
https.createServer(sslOptions, app).listen(process.env.PORT || 3000, () => {
	console.log(`📊 Serveur démarré en HTTPS sur le port ${process.env.PORT || 3000}`);
});
