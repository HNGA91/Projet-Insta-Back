const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];

	if (!token) {
		return res.status(401).json({
			message: "⛔ Accès refusé: Token d'authentification manquant",
		});
	}

	jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
		if (err) {
			return res.status(403).json({
				message: "❌ Token invalide ou expiré",
			});
		}

		// Vérification pour les routes UserData (basées sur email)
		if (req.params.email && decodedToken.email !== req.params.email) {
			return res.status(403).json({
				message: "⛔ Accès non autorisé: Vous ne pouvez accéder qu'à vos propres données",
			});
		}

		req.user = decodedToken;
		next();
	});
};

module.exports = authenticateToken;
