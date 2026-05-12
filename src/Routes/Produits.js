const express = require("express");
const router = express.Router();
const { getAllProduits, getProduitById, createProduit, updateProduit, deleteProduit } = require("../Models/Produit");

// GET - Récupérer tous les produits
router.get("/", async (req, res) => {
	try {
		const produits = await getAllProduits();
		res.status(200).json(produits);
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// GET - Récupérer un produit par ID
router.get("/:id", async (req, res) => {
	try {
		const produit = await getProduitById(req.params.id);
		if (!produit) {
			return res.status(404).json({ message: "Produit non trouvé" });
		}
		res.status(200).json(produit);
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// POST - Créer un produit
router.post("/", async (req, res) => {
	try {
		const insertId = await createProduit(req.body);
		res.status(201).json({ message: "Produit créé", id_produit: insertId });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// PUT - Modifier un produit
router.put("/:id", async (req, res) => {
	try {
		const affectedRows = await updateProduit(req.params.id, req.body);
		if (affectedRows === 0) {
			return res.status(404).json({ message: "Produit non trouvé" });
		}
		res.status(200).json({ message: "Produit mis à jour" });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// DELETE - Supprimer un produit
router.delete("/:id", async (req, res) => {
	try {
		const affectedRows = await deleteProduit(req.params.id);
		if (affectedRows === 0) {
			return res.status(404).json({ message: "Produit non trouvé" });
		}
		res.status(200).json({ message: "Produit supprimé" });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

module.exports = router;
