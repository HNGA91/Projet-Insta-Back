const express = require("express");
const router = express.Router();
const Article = require("../Models/MySQL/Article");
const Produit = require("../Models/MySQL/Produit");
const authenticateToken = require("../Middleware/Authentification");
const isAdmin = require("../Middleware/IsAdmin");

// GET - Récupérer tous les articles (avec le produit/catégorie)
router.get("/", async (req, res) => {
	try {
		const articles = await Article.findAll({
			include: [
				{
					model: Produit,
					as: "produit",
					attributes: ["titre"],
				},
			],
		});
		res.status(200).json(articles);
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// GET - Récupérer un article par ID
router.get("/:id", async (req, res) => {
	try {
		const article = await Article.findByPk(req.params.id, {
			include: [
				{
					model: Produit,
					as: "produit",
					attributes: ["titre"],
				},
			],
		});
		if (!article) {
			return res.status(404).json({ message: "❌ Article non trouvé" });
		}
		res.status(200).json(article);
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// GET - Récupérer les articles d'un produit/catégorie
router.get("/produit/:id_produit", async (req, res) => {
	try {
		const articles = await Article.findAll({
			where: { id_produit: req.params.id_produit },
		});
		res.status(200).json(articles);
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// POST - Créer un article
router.post("/", authenticateToken, isAdmin, async (req, res) => {
	try {
		const article = await Article.create(req.body);
		res.status(201).json({ message: "✅ Article créé", id_article: article.id_article });
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// PUT - Modifier un article
router.put("/:id", authenticateToken, isAdmin, async (req, res) => {
	try {
		const [affectedRows] = await Article.update(req.body, {
			where: { id_article: req.params.id },
		});
		if (affectedRows === 0) {
			return res.status(404).json({ message: "❌ Article non trouvé" });
		}
		res.status(200).json({ message: "✅ Article mis à jour" });
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// PATCH - Mettre à jour uniquement le stock
router.patch("/:id/stock", authenticateToken, isAdmin, async (req, res) => {
	try {
		const { stock } = req.body;
		if (stock === undefined || stock < 0) {
			return res.status(400).json({ message: "❌ Valeur de stock invalide" });
		}
		const disponibilite = stock === 0 ? "rupture" : "disponible";
		const [affectedRows] = await Article.update({ stock, disponibilite }, { where: { id_article: req.params.id } });
		if (affectedRows === 0) {
			return res.status(404).json({ message: "❌ Article non trouvé" });
		}
		res.status(200).json({ message: "✅ Stock mis à jour" });
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// DELETE - Supprimer un article
router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
	try {
		const affectedRows = await Article.destroy({
			where: { id_article: req.params.id },
		});
		if (affectedRows === 0) {
			return res.status(404).json({ message: "❌ Article non trouvé" });
		}
		res.status(200).json({ message: "✅ Article supprimé" });
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

module.exports = router;
