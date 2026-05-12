const express = require("express");
const router = express.Router();
const {
	getAllArticles,
	getArticleById,
	getArticlesByProduit,
	createArticle,
	updateArticle,
	updateStock,
	deleteArticle,
} = require("../Models/Article");

// GET - Récupérer tous les articles
router.get("/", async (req, res) => {
	try {
		const articles = await getAllArticles();
		res.status(200).json(articles);
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// GET - Récupérer un article par ID
router.get("/:id", async (req, res) => {
	try {
		const article = await getArticleById(req.params.id);
		if (!article) {
			return res.status(404).json({ message: "Article non trouvé" });
		}
		res.status(200).json(article);
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// GET - Récupérer les articles d'un produit/catégorie
router.get("/produit/:id_produit", async (req, res) => {
	try {
		const articles = await getArticlesByProduit(req.params.id_produit);
		res.status(200).json(articles);
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// POST - Créer un article
router.post("/", async (req, res) => {
	try {
		const insertId = await createArticle(req.body);
		res.status(201).json({ message: "Article créé", id_article: insertId });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// PUT - Modifier un article
router.put("/:id", async (req, res) => {
	try {
		const affectedRows = await updateArticle(req.params.id, req.body);
		if (affectedRows === 0) {
			return res.status(404).json({ message: "Article non trouvé" });
		}
		res.status(200).json({ message: "Article mis à jour" });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// PATCH - Mettre à jour uniquement le stock
router.patch("/:id/stock", async (req, res) => {
	try {
		const { stock } = req.body;
		if (stock === undefined || stock < 0) {
			return res.status(400).json({ message: "Valeur de stock invalide" });
		}
		const affectedRows = await updateStock(req.params.id, stock);
		if (affectedRows === 0) {
			return res.status(404).json({ message: "Article non trouvé" });
		}
		res.status(200).json({ message: "Stock mis à jour" });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// DELETE - Supprimer un article
router.delete("/:id", async (req, res) => {
	try {
		const affectedRows = await deleteArticle(req.params.id);
		if (affectedRows === 0) {
			return res.status(404).json({ message: "Article non trouvé" });
		}
		res.status(200).json({ message: "Article supprimé" });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

module.exports = router;
