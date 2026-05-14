// Middleware qui vérifie que l'utilisateur connecté est un admin
// Doit toujours être utilisé APRÈS authenticateToken
const isAdmin = (req, res, next) => {
	if (req.user.role !== "admin") {
		return res.status(403).json({
			message: "⛔ Accès refusé : droits administrateur requis",
		});
	}
	next();
};

module.exports = isAdmin;
