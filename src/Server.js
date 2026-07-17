require("dotenv").config();

const fs = require("fs");
const http = require("http");
const https = require("https");
const app = require("./ExpressApp");
const connectDB = require("./MongoDB");
require("./SequelizeDB");

connectDB();

const PORT = process.env.PORT || 3000;
const keyPath = "localhost-key.pem";
const certPath = "localhost.pem";

// En local, on démarre en HTTPS avec les certificats mkcert (nécessaire pour
// tester les cookies secure/sameSite). Sur Railway (ou tout autre hébergeur),
// ces fichiers n'existent pas : Railway gère le HTTPS public en frontal et
// redirige le trafic vers notre serveur en simple HTTP en interne.
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
	const sslOptions = {
		key: fs.readFileSync(keyPath),
		cert: fs.readFileSync(certPath),
	};

	https.createServer(sslOptions, app).listen(PORT, () => {
		console.log(`📊 Serveur démarré en HTTPS sur le port ${PORT}`);
	});
} else {
	http.createServer(app).listen(PORT, () => {
		console.log(`📊 Serveur démarré en HTTP sur le port ${PORT} (HTTPS géré par l'hébergeur)`);
	});
}
