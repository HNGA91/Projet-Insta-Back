const jwt = require("jsonwebtoken");

/**
 * Middleware de vérification JWT
 * Vérifie que le token est valide ET que l'utilisateur accède à ses propres données
 */
const authenticateToken = (req, res, next) => {
	// 1. Récupérer le token depuis le header Authorization
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1]; // Format: "Bearer VOTRE_TOKEN"

	// 2. Si pas de token → erreur 401
	if (!token) {
		return res.status(401).json({
			message: "⛔ Accès refusé: Token d'authentification manquant",
		});
	}

	// 3. Vérifier la validité du token
	jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
		if (err) {
			return res.status(403).json({
				message: "❌ Token invalide ou expiré",
			});
		}

		// 4. Vérifier que l'utilisateur accède à SES propres données
		// decodedToken.email vient du token, req.params.email vient de l'URL
		if (decodedToken.email !== req.params.email) {
			return res.status(403).json({
				message: "⛔ Accès non autorisé: Vous ne pouvez accéder qu'à vos propres données",
			});
		}

		// 5. Token valide et accès autorisé → continuer
		req.user = decodedToken; // Stocke les infos user dans la request
		next();
	});
};

module.exports = authenticateToken;
