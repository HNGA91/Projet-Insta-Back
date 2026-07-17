const express = require("express");
const cors = require("cors");
const paiementRoutes = require("./Routes/Paiement");
const cookieParser = require("cookie-parser");
const helmet = require("helmet"); // Sécurise les headers HTTP
const path = require("path");

const UserRoutes = require("./Routes/Users");
const AdresseRoutes = require("./Routes/Adresses");
const CommandeRoutes = require("./Routes/Commandes");
const ArticleRoutes = require("./Routes/Articles");
const ProduitRoutes = require("./Routes/Produits");
const UserDataRoutes = require("./Routes/UserData");
const AuthRoutes = require("./Routes/AuthRoutes");
const contactRoutes = require("./Routes/Contact");

const app = express();

// IMPORTANT : le webhook Stripe doit être déclaré AVANT express.json()
// car Stripe vérifie la signature sur le body brut
app.use("/api/paiement/webhook", express.raw({ type: "application/json" }));

// Helmet doit être placé tout en haut, avant les autres middlewares
// Il configure automatiquement : X-Frame-Options, X-Content-Type-Options,
// CSP, suppression de X-Powered-By, et d'autres headers de sécurité
app.use(
	helmet({
		// Configuration personnalisée du CSP
		// Par défaut, Helmet bloque tout sauf les ressources du domaine
		contentSecurityPolicy: {
			directives: {
				// Sources par défaut autorisées : uniquement du domaine
				defaultSrc: ["'self'"],
				// Scripts JS autorisés uniquement depuis le domaine
				scriptSrc: ["'self'"],
				// Images autorisées depuis le domaine + data: + le back (port 3000)
				imgSrc: ["'self'", "data:", "https://localhost:3000"],
				// Styles autorisés depuis le domaine
				styleSrc: ["'self'"],
				// Connexions API autorisées vers le backend en HTTPS
				connectSrc: ["'self'", "https://localhost:3000"],
			},
		},
	}),
);

// Middlewares existants
app.use(cors({ origin: "https://localhost:5173", credentials: true }));
// Uniquement https://localhost:5173 et Cookies transmis avec les requêtes
app.use(express.json());
app.use(cookieParser());

// Servir les images statiques depuis public/Images/
// Accessible via https://localhost:3000/Images/...
// cross-origin: "cross-origin" permet au front (port 5173) d'accéder aux images du back (port 3000)
app.use("/Images", (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "https://localhost:5173");
    next();
}, express.static(path.join(process.cwd(), "public", "Images")));

// Dit à Express : "Toutes ces routes doivent être accessibles"
app.use("/api/adresses", AdresseRoutes);
app.use("/api/articles", ArticleRoutes);
app.use("/api/produits", ProduitRoutes);
app.use("/api/commandes", CommandeRoutes);
app.use("/api/userdata", UserDataRoutes);
app.use("/api/users", UserRoutes);
app.use("/api/auth", AuthRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/paiement", paiementRoutes);

module.exports = app;
