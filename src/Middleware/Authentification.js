const jwt = require("jsonwebtoken");

/**Ce middleware s'insère dans la chaîne de traitement Express (via app.use()
 * ou directement sur une route) pour protéger les routes qui nécessitent
 * un utilisateur connecté. Il vérifie la présence et la validité du token,
 * puis attache les informations de l'utilisateur à la requête (req.user)
 * pour que les routes suivantes puissent les utiliser.
 */
const authenticateToken = (req, res, next) => {
	// Le token est envoyé par le client dans le header HTTP "Authorization",
	// généralement sous la forme : "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6..."
	const authHeader = req.headers["authorization"];

	// On découpe la chaîne "Bearer <token>" sur l'espace pour ne garder
	// que le token (index 1). Si authHeader est undefined, l'opérateur
	// "&&" court-circuite et token vaut undefined sans lever d'erreur.
	const token = authHeader && authHeader.split(" ")[1];

	// Aucun token fourni -> l'utilisateur n'est pas authentifié du tout.
	// On bloque la requête avec un statut 401 (Unauthorized).
	if (!token) {
		return res.status(401).json({
			message: "⛔ Accès refusé: Token d'authentification manquant",
		});
	}

	// Vérifie la signature et l'expiration du token à l'aide de la clé
	// secrète stockée dans les variables d'environnement (JWT_SECRET).
	// Cette opération est asynchrone : le callback (err, decodedToken)
	// est appelé une fois la vérification terminée.
	jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
		// Le token est invalide (signature incorrecte) ou expiré.
		// On renvoie un statut 403 (Forbidden) car le token existe
		// mais n'est pas/plus valide.
		if (err) {
			return res.status(403).json({
				message: "❌ Token invalide ou expiré",
			});
		}

		// Contrôle d'accès supplémentaire pour les routes de type
		// UserData où l'email est passé en paramètre d'URL (ex: /users/:email).
		// On vérifie que l'email présent dans le token (decodedToken.email)
		// correspond bien à celui demandé dans l'URL, afin d'empêcher
		// un utilisateur authentifié d'accéder aux données d'un autre compte.
		if (req.params.email && decodedToken.email !== req.params.email) {
			return res.status(403).json({
				message: "⛔ Accès non autorisé: Vous ne pouvez accéder qu'à vos propres données",
			});
		}

		// Token valide : on attache les informations décodées du token
		// (payload) à l'objet req, afin que les middlewares/contrôleurs
		// suivants puissent y accéder via req.user (ex: req.user.email, req.user.id...).
		req.user = decodedToken;

		// On passe la main au middleware/route suivant dans la chaîne.
		next();
	});
};

module.exports = authenticateToken;
