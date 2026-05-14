const express = require("express");
const router = express.Router();
const Produit = require("../Models/MySQL/Produit");
const authenticateToken = require("../Middleware/Authentification");
const isAdmin = require("../Middleware/IsAdmin");

// GET - Récupérer tous les produits
router.get("/", async (req, res) => {
	try {
		const produits = await Produit.findAll();
		res.status(200).json(produits);
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// GET - Récupérer un produit par ID
router.get("/:id", async (req, res) => {
	try {
		const produit = await Produit.findByPk(req.params.id);
		if (!produit) {
			return res.status(404).json({ message: "❌ Produit non trouvé" });
		}
		res.status(200).json(produit);
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// POST - Créer un produit
router.post("/", authenticateToken, isAdmin, async (req, res) => {
	try {
		const produit = await Produit.create(req.body);
		res.status(201).json({ message: "✅ Produit créé", id_produit: produit.id_produit });
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// PUT - Modifier un produit
router.put("/:id", authenticateToken, isAdmin, async (req, res) => {
	try {
		const [affectedRows] = await Produit.update(req.body, {
			where: { id_produit: req.params.id },
		});
		if (affectedRows === 0) {
			return res.status(404).json({ message: "Produit non trouvé" });
		}
		res.status(200).json({ message: "Produit mis à jour" });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// DELETE - Supprimer un produit
router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
	try {
		const affectedRows = await Produit.destroy({
			where: { id_produit: req.params.id },
		});
		if (affectedRows === 0) {
			return res.status(404).json({ message: "Produit non trouvé" });
		}
		res.status(200).json({ message: "Produit supprimé" });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

module.exports = router;
