const express = require("express");
const router = express.Router();
const UserData = require("../Models/UserData");
const authenticateToken = require("../Middleware/Authentification");

// GET : Récupérer les données utilisateur (panier + favoris)
// Afin de charger les données au login ou au démarrage de l'app
router.get("/:email", authenticateToken, async (req, res) => {
	try {
		// req.user est disponible grâce au middleware
		console.log("✅ Utilisateur authentifié:", req.user.email);

		// Cherche l'utilisateur dans la collection UserData dans MongoDB
		const userData = await UserData.findOne({ userEmail: req.params.email });

		if (!userData) {
			// Créer des données par défaut si l'utilisateur n'existe pas.
			// Pour éviter les erreurs "utilisateur non trouvé".
			// Si un utilisateur se connecte pour la première fois, le système crée automatiquement un profil vide plutôt que de retourner une erreur.
			const newUserData = new UserData({
				userEmail: req.params.email, // Email du user connecté
				panier: [],
				favoris: [],
			});
			await newUserData.save();
			return res.json(newUserData); // Renvoi le nouveau document
		}

		// Renvoie les données au front au format JSON
		res.json(userData);
	} catch (err) {
        // En cas d'erreur renvoi une erreur 500
		console.error("❌ Erreur lors de la récupération des données:", err);
		res.status(500).json({ message: err.message });
	}
});

// PUT : Mettre à jour le panier
// Synchronise le panier après chaque modification
router.put("/:email/panier", authenticateToken, async (req, res) => {
	try {
		// Reçoit le panier complet depuis le frontend
		const { panier } = req.body;

		// Met à jour ou crée le document avec le nouveau panier
		const userData = await UserData.findOneAndUpdate(
			{ userEmail: req.params.email },
			{
				panier: panier,
				lastUpdated: new Date(),
			},

			// upsert: crée si n'existe pas
			{ new: true, upsert: true }
		);

		res.json(userData); // Retourne les données mises à jour
	} catch (err) {
		console.error("❌ Erreur lors de la mise à jour du panier:", err);
		res.status(500).json({ message: err.message });
	}
});

// PUT : Mettre à jour les favoris
// Synchronise les favoris après chaque modification
router.put("/:email/favoris", authenticateToken, async (req, res) => {
	try {
		// Reçoit les favoris complets depuis le frontend
		const { favoris } = req.body;

		const userData = await UserData.findOneAndUpdate(
			{ userEmail: req.params.email },
			{
				favoris: favoris,
				lastUpdated: new Date(),
			},
			{ new: true, upsert: true }
		);

		res.json(userData);
	} catch (err) {
		console.error("❌ Erreur lors de la mise à jour des favoris:", err);
		res.status(500).json({ message: err.message });
	}
});

// DELETE : Supprimer les données utilisateur (pour la déconnexion)
router.delete("/:email", authenticateToken, async (req, res) => {
	try {
		await UserData.findOneAndDelete({ userEmail: req.params.email });
		// Ce message s'affiche dans la console du frontend qui a fait la requête
		res.json({ message: "Données utilisateur supprimées" });
	} catch (err) {
		console.error("❌ Erreur lors de la suppression des données:", err);
		res.status(500).json({ message: err.message });
	}
});

module.exports = router;
