const express = require("express");
const router = express.Router();
const Adresse = require("../Models/MySQL/Adresse");
const Gerer = require("../Models/MySQL/Gerer");
const Utilisateur = require("../Models/MySQL/User");
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

		// Récupérer les adresses via la table de jonction gerer
		const utilisateur = await Utilisateur.findByPk(req.params.id_user, {
			include: [{ model: Adresse, as: "adresses" }],
		});

		res.status(200).json(utilisateur.adresses);
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
		const lien = await Gerer.findOne({
			where: { id_user: req.user.id_user, id_adresse: adresse.id_adresse },
		});

        if (!lien) {
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
		});

		// Créer le lien dans gerer
		// Respecte la cardinalité 1,n : l'adresse a immédiatement au moins 1 utilisateur
		await Gerer.create({
			id_user: req.user.id_user,
			id_adresse: adresse.id_adresse,
		});

		res.status(201).json({
			message: "✅ Adresse créée",
			id_adresse: adresse.id_adresse,
		});
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// POST - Associer une adresse existante à l'utilisateur connecté
// Cas d'usage : plusieurs utilisateurs partagent le même foyer
router.post("/associer/:id_adresse", authenticateToken, async (req, res) => {
	try {
		const adresse = await Adresse.findByPk(req.params.id_adresse);

		if (!adresse) {
			return res.status(404).json({ message: "❌ Adresse non trouvée" });
		}

		// Vérifier que le lien n'existe pas déjà
		const lienExistant = await Gerer.findOne({
			where: { id_user: req.user.id_user, id_adresse: adresse.id_adresse },
		});

		if (lienExistant) {
			return res.status(409).json({
				message: "⚠️ Cette adresse est déjà associée à votre compte",
			});
		}

		await Gerer.create({
			id_user: req.user.id_user,
			id_adresse: adresse.id_adresse,
		});

		res.status(201).json({ message: "✅ Adresse associée à votre compte" });
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
		const lien = await Gerer.findOne({
			where: { id_user: req.user.id_user, id_adresse: adresse.id_adresse },
		});

		if (!lien) {
			return res.status(403).json({ message: "⛔ Accès non autorisé" });
		}

		const { rue, ville, code_postal, pays } = req.body;
		await adresse.update({ rue, ville, code_postal, pays });

		res.status(200).json({ message: "✅ Adresse mise à jour" });
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// DELETE - Dissocier l'utilisateur de l'adresse
// Respecte la cardinalité 1,n : on ne supprime l'adresse que si
// plus aucun utilisateur ne lui est associé
router.delete("/:id", authenticateToken, async (req, res) => {
	try {
		const adresse = await Adresse.findByPk(req.params.id);

		if (!adresse) {
			return res.status(404).json({ message: "❌ Adresse non trouvée" });
		}

		// Vérifier que le lien existe
		const lien = await Gerer.findOne({
			where: { id_user: req.user.id_user, id_adresse: adresse.id_adresse },
		});

		if (!lien) {
			return res.status(403).json({ message: "⛔ Accès non autorisé" });
		}

		// Supprimer le lien entre l'utilisateur et l'adresse
		await lien.destroy();

		// Vérifier combien d'utilisateurs utilisent encore cette adresse
		const nbUtilisateurs = await Gerer.count({
			where: { id_adresse: adresse.id_adresse },
		});

		// Cardinalité 1,n : si plus aucun utilisateur n'est lié → supprimer l'adresse
		if (nbUtilisateurs === 0) {
			await adresse.destroy();
			return res.status(200).json({
				message: "✅ Adresse supprimée définitivement (aucun autre utilisateur associé)",
			});
		}

		res.status(200).json({
			message: "✅ Adresse dissociée de votre compte",
		});
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

module.exports = router;
