// src/Routes/Adresses.js
const express = require("express");
const router = express.Router();
const Adresse = require("../Models/MySQL/Adresse");
const authenticateToken = require("../Middleware/Authentification");

// GET - Récupérer toutes les adresses d'un utilisateur
// Route protégée : seul l'utilisateur connecté peut voir ses adresses
router.get("/user/:id_user", authenticateToken, async (req, res) => {
	try {
		// Vérifier que l'utilisateur accède à SES propres adresses
		if (req.user.id_user !== parseInt(req.params.id_user)) {
			return res.status(403).json({
				message: "⛔ Accès non autorisé",
			});
		}

		const adresses = await Adresse.findAll({
			where: { id_user: req.params.id_user },
		});

		res.status(200).json(adresses);
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// GET - Récupérer une adresse par ID
router.get("/:id", authenticateToken, async (req, res) => {
	try {
		const adresse = await Adresse.findByPk(req.params.id);

		if (!adresse) {
			return res.status(404).json({ message: "❌ Adresse non trouvée" });
		}

		// Vérifier que l'adresse appartient bien à l'utilisateur connecté
		if (adresse.id_user !== req.user.id_user) {
			return res.status(403).json({ message: "⛔ Accès non autorisé" });
		}

		res.status(200).json(adresse);
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// POST - Créer une nouvelle adresse pour l'utilisateur connecté
router.post("/", authenticateToken, async (req, res) => {
	try {
		const { rue, ville, code_postal, pays } = req.body;

		// L'id_user vient du token JWT, pas du body
		// Cela évite qu'un utilisateur crée une adresse pour quelqu'un d'autre
		const adresse = await Adresse.create({
			rue,
			ville,
			code_postal,
			pays: pays || "France",
			id_user: req.user.id_user,
		});

		res.status(201).json({
			message: "Adresse créée",
			id_adresse: adresse.id_adresse,
		});
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// PUT - Modifier une adresse
router.put("/:id", authenticateToken, async (req, res) => {
	try {
		const adresse = await Adresse.findByPk(req.params.id);

		if (!adresse) {
			return res.status(404).json({ message: "❌ Adresse non trouvée" });
		}

		// Vérifier que l'adresse appartient bien à l'utilisateur connecté
		if (adresse.id_user !== req.user.id_user) {
			return res.status(403).json({ message: "⛔ Accès non autorisé" });
		}

		const { rue, ville, code_postal, pays } = req.body;
		await adresse.update({ rue, ville, code_postal, pays });

		res.status(200).json({ message: "✅ Adresse mise à jour" });
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// DELETE - Supprimer une adresse
router.delete("/:id", authenticateToken, async (req, res) => {
	try {
		const adresse = await Adresse.findByPk(req.params.id);

		if (!adresse) {
			return res.status(404).json({ message: "❌ Adresse non trouvée" });
		}

		// Vérifier que l'adresse appartient bien à l'utilisateur connecté
		if (adresse.id_user !== req.user.id_user) {
			return res.status(403).json({ message: "⛔ Accès non autorisé" });
		}

		await adresse.destroy();
		res.status(200).json({ message: "✅ Adresse supprimée" });
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

module.exports = router;
