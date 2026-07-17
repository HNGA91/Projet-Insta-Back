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

// Liste des origines autorisées à appeler le backend :
// - l'URL de développement local (toujours utile pour continuer à coder en local)
// - l'URL de production, définie via la variable d'environnement FRONTEND_URL
const allowedOrigins = ["https://localhost:5173", process.env.FRONTEND_URL].filter(Boolean);

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
				// Images autorisées depuis le domaine + data: + les origines autorisées
				imgSrc: ["'self'", "data:", ...allowedOrigins],
				// Styles autorisés depuis le domaine
				styleSrc: ["'self'"],
				// Connexions API autorisées vers les origines autorisées
				connectSrc: ["'self'", ...allowedOrigins],
			},
		},
	}),
);

// Middlewares existants
// origin accepte soit localhost (dev), soit l'URL de production (FRONTEND_URL)
app.use(
	cors({
		origin: allowedOrigins,
		credentials: true,
	}),
);
app.use(express.json());
app.use(cookieParser());

// Servir les images statiques depuis public/Images/
// Accessible via /Images/...
// cross-origin: "cross-origin" permet au front d'accéder aux images du back
app.use(
	"/Images",
	(req, res, next) => {
		res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
		// On reflète l'origine de la requête si elle fait partie des origines autorisées
		const origin = req.headers.origin;
		if (allowedOrigins.includes(origin)) {
			res.setHeader("Access-Control-Allow-Origin", origin);
		}
		next();
	},
	express.static(path.join(process.cwd(), "public", "Images")),
);

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
