const express = require("express");
const router = express.Router();
const Utilisateur = require("../Models/MySQL/User");
const authenticateToken = require("../Middleware/Authentification");
const isAdmin = require("../Middleware/IsAdmin");
const bcrypt = require("bcrypt");

// GET - Récupérer tous les utilisateurs (admin uniquement)
router.get("/", authenticateToken, isAdmin, async (req, res) => {
	try {
		const utilisateurs = await Utilisateur.findAll({
			// On exclut le mot de passe des résultats
			attributes: { exclude: ["password"] },
		});
		res.status(200).json(utilisateurs);
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// GET - Récupérer un utilisateur par ID
router.get("/:id", authenticateToken, async (req, res) => {
	try {
		// Vérifier que c'est l'utilisateur lui-même ou un admin
		if (req.user.id_user !== parseInt(req.params.id) && req.user.role !== "admin") {
			return res.status(403).json({ message: "Accès non autorisé" });
		}

		const utilisateur = await Utilisateur.findByPk(req.params.id, {
			attributes: { exclude: ["password"] },
		});

		if (!utilisateur) {
			return res.status(404).json({ message: "Utilisateur non trouvé" });
		}

		res.status(200).json(utilisateur);
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// PUT - Modifier un utilisateur
// Accessible par l'admin OU par l'utilisateur lui-même
router.put("/:id", authenticateToken, async (req, res) => {
	try {
		// Vérifier que c'est l'utilisateur lui-même ou un admin
		if (req.user.id_user !== parseInt(req.params.id) && req.user.role !== "admin") {
			return res.status(403).json({ message: "Accès non autorisé" });
		}

		const utilisateur = await Utilisateur.findByPk(req.params.id);
		if (!utilisateur) {
			return res.status(404).json({ message: "Utilisateur non trouvé" });
		}

		const { nom, prenom, email, tel } = req.body;

		// Vérifier que le nouvel email n'est pas déjà utilisé par un autre compte
		if (email && email !== utilisateur.email) {
			const emailExistant = await Utilisateur.findOne({ where: { email } });
			if (emailExistant) {
				return res.status(409).json({ message: "Cet email est déjà utilisé par un autre compte" });
			}
		}

		// Un utilisateur normal ne peut pas changer son propre rôle
		// Seul un admin peut modifier le rôle
		const role = req.user.role === "admin" ? req.body.role : utilisateur.role;

		await utilisateur.update({ nom, prenom, email, tel, role });

		res.status(200).json({ message: "✅ Utilisateur mis à jour" });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// PUT - Modifier le mot de passe
router.put("/:id/password", authenticateToken, async (req, res) => {
	try {
		// Vérifier que c'est l'utilisateur lui-même
		if (req.user.id_user !== parseInt(req.params.id)) {
			return res.status(403).json({ message: "Accès non autorisé" });
		}

		const utilisateur = await Utilisateur.findByPk(req.params.id);
		if (!utilisateur) {
			return res.status(404).json({ message: "Utilisateur non trouvé" });
		}

		const { ancienPassword, nouveauPassword } = req.body;

		// Vérifier que l'ancien mot de passe est correct
		const isValid = await bcrypt.compare(ancienPassword, utilisateur.password);
		if (!isValid) {
			return res.status(401).json({ message: "Mot de passe actuel incorrect" });
		}

		// Hasher et sauvegarder le nouveau mot de passe
		const hashedPassword = await bcrypt.hash(nouveauPassword, 10);
		await utilisateur.update({ password: hashedPassword });

		res.status(200).json({ message: "Mot de passe modifié avec succès" });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// DELETE - Supprimer un utilisateur (admin uniquement)
router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
	try {
		// Empêcher un admin de se supprimer lui-même
		if (req.user.id_user === parseInt(req.params.id)) {
			return res.status(400).json({
				message: "Vous ne pouvez pas supprimer votre propre compte",
			});
		}

		const utilisateur = await Utilisateur.findByPk(req.params.id);
		if (!utilisateur) {
			return res.status(404).json({ message: "Utilisateur non trouvé" });
		}

		await utilisateur.destroy();
		res.status(200).json({ message: "✅ Utilisateur supprimé" });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

module.exports = router;
