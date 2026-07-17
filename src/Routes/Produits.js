const express = require("express");
const router = express.Router();
const Produit = require("../Models/MySQL/Produit");
const authenticateToken = require("../Middleware/Authentification");
const isAdmin = require("../Middleware/IsAdmin");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// =============== UPLOAD D'IMAGES ===============

// Les images produits sont stockées dans public/Images/Produits/
const storageProduit = multer.diskStorage({
	destination: (req, file, cb) => {
		const dossier = path.join(process.cwd(), "public", "Images", "Produits");
		fs.mkdirSync(dossier, { recursive: true });
		cb(null, dossier);
	},
	filename: (req, file, cb) => {
		// On utilise le nom original du fichier (sans le sanitize qui causait l'écrasement)
		// Le nom original est conservé tel quel pour correspondre à ce que l'admin a choisi
		const ext = path.extname(file.originalname);
		const baseName = path.basename(file.originalname, ext);
		const filename = `${baseName}${ext}`;
		cb(null, filename);
	},
});

const uploadProduit = multer({
	storage: storageProduit,
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		const typesAcceptes = ["image/jpeg", "image/png", "image/webp"];
		typesAcceptes.includes(file.mimetype) ? cb(null, true) : cb(new Error("Format non accepté. Utilisez JPG, PNG ou WebP."));
	},
});

// =============== ROUTES PRODUITS ===============

// GET - Récupérer tous les produits
router.get("/", async (req, res) => {
	try {
		const produits = await Produit.findAll();
		res.status(200).json(produits);
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// GET - Récupérer un produit par ID
router.get("/:id", async (req, res) => {
	try {
		const produit = await Produit.findByPk(req.params.id);
		if (!produit) return res.status(404).json({ message: "Produit non trouvé" });
		res.status(200).json(produit);
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// POST - Upload image produit
router.post("/upload-image", authenticateToken, isAdmin, uploadProduit.single("image"), (req, res) => {
	if (!req.file) return res.status(400).json({ message: "Aucun fichier reçu" });
	res.status(200).json({
		message: "✅ Image uploadée",
		filename: req.file.filename,
	});
});

// POST - Créer un produit
router.post("/", authenticateToken, isAdmin, async (req, res) => {
	try {
		const produit = await Produit.create(req.body);
		res.status(201).json({ message: "✅ Produit créé", id_produit: produit.id_produit });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// PUT - Modifier un produit
router.put("/:id", authenticateToken, isAdmin, async (req, res) => {
	try {
		const [affectedRows] = await Produit.update(req.body, { where: { id_produit: req.params.id } });
		if (affectedRows === 0) return res.status(404).json({ message: "Produit non trouvé" });
		res.status(200).json({ message: "Produit mis à jour" });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// DELETE - Supprimer un produit
router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
	try {
		const affectedRows = await Produit.destroy({ where: { id_produit: req.params.id } });
		if (affectedRows === 0) return res.status(404).json({ message: "Produit non trouvé" });
		res.status(200).json({ message: "Produit supprimé" });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

module.exports = router;
