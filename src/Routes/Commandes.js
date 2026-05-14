const express = require("express");
const router = express.Router();
const sequelize = require("../SequelizeDB");
const Commande = require("../Models/MySQL/Commande");
const Acheter = require("../Models/MySQL/Acheter");
const Article = require("../Models/MySQL/Article");
const Adresse = require("../Models/MySQL/Adresse");
const authenticateToken = require("../Middleware/Authentification");
const isAdmin = require("../Middleware/IsAdmin");

// =============== FONCTION UTILITAIRE ===============

// Génère une référence unique pour chaque commande
// Format : CMD-YYYYMMDD-XXXX (ex: CMD-20260513-4521)
const generateReference = () => {
	const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
	const random = Math.floor(1000 + Math.random() * 9000);
	return `CMD-${date}-${random}`;
};

// =============== ROUTES ===============

// GET - Récupérer toutes les commandes (admin uniquement)
router.get("/", authenticateToken, isAdmin, async (req, res) => {
	try {
		const commandes = await Commande.findAll({
			// Inclure les lignes de commande avec les détails des articles
			include: [
				{
					model: Acheter,
					as: "lignes",
					include: [
						{
							model: Article,
							as: "article",
							attributes: ["id_article", "titre", "image", "prix"],
						},
					],
				},
			],
			// Trier par date décroissante (plus récente en premier)
			order: [["dateCommande", "DESC"]],
		});
		res.status(200).json(commandes);
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// GET - Récupérer toutes les commandes d'un utilisateur
// Accessible par l'utilisateur lui-même ou un admin
router.get("/user/:id_user", authenticateToken, async (req, res) => {
	try {
		// Vérifier que c'est l'utilisateur lui-même ou un admin
		if (req.user.id_user !== parseInt(req.params.id_user) && req.user.role !== "admin") {
			return res.status(403).json({ message: "⛔ Accès non autorisé" });
		}

		const commandes = await Commande.findAll({
			where: { id_user: req.params.id_user },
			include: [
				{
					model: Acheter,
					as: "lignes",
					include: [
						{
							model: Article,
							as: "article",
							attributes: ["id_article", "titre", "image", "prix"],
						},
					],
				},
			],
			order: [["dateCommande", "DESC"]],
		});

		res.status(200).json(commandes);
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// GET - Récupérer une commande par ID
router.get("/:id", authenticateToken, async (req, res) => {
	try {
		const commande = await Commande.findByPk(req.params.id, {
			include: [
				{
					model: Acheter,
					as: "lignes",
					include: [
						{
							model: Article,
							as: "article",
							attributes: ["id_article", "titre", "image", "prix"],
						},
					],
				},
			],
		});

		if (!commande) {
			return res.status(404).json({ message: "❌ Commande non trouvée" });
		}

		// Vérifier que c'est la commande de l'utilisateur connecté ou un admin
		if (commande.id_user !== req.user.id_user && req.user.role !== "admin") {
			return res.status(403).json({ message: "⛔ Accès non autorisé" });
		}

		res.status(200).json(commande);
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// POST - Créer une nouvelle commande
router.post("/", authenticateToken, async (req, res) => {
	// On utilise une TRANSACTION pour garantir l'intégrité des données
	// Si une étape échoue, TOUT est annulé (commande + lignes)
	const transaction = await sequelize.transaction();

	try {
		const { id_adresse, panier } = req.body;

		// Vérifier que le panier n'est pas vide
		if (!panier || panier.length === 0) {
			await transaction.rollback();
			return res.status(400).json({ message: "❌ Le panier est vide" });
		}

		// Récupérer l'adresse choisie par l'utilisateur
		const adresse = await Adresse.findByPk(id_adresse);
		if (!adresse) {
			await transaction.rollback();
			return res.status(404).json({ message: "❌ Adresse non trouvée" });
		}

		// Vérifier que l'adresse appartient bien à l'utilisateur connecté
		if (adresse.id_user !== req.user.id_user) {
			await transaction.rollback();
			return res.status(403).json({ message: "⛔ Adresse non autorisée" });
		}

		// Calculer le montant total de la commande
		const montant_total = panier.reduce((acc, item) => acc + item.prix * item.quantite, 0);

		// Créer la commande avec le snapshot de l'adresse
		const commande = await Commande.create(
			{
				reference: generateReference(),
				// Snapshot de l'adresse au moment de la commande
				adresseLivraison_rue: adresse.rue,
				adresseLivraison_ville: adresse.ville,
				adresseLivraison_cp: adresse.code_postal,
				adresseLivraison_pays: adresse.pays,
				montant_total: montant_total.toFixed(2),
				id_user: req.user.id_user,
			},
			{ transaction },
		); // On passe la transaction à chaque opération

		// Créer les lignes de commande (une par article du panier)
		const lignes = panier.map((item) => ({
			id_commande: commande.id_commande,
			id_article: item._id ? parseInt(item._id) : item.id_article,
			quantite: item.quantite,
			// On fige le prix au moment de la commande
			prix_unitaire: item.prix,
		}));

		await Acheter.bulkCreate(lignes, { transaction });

		// Mettre à jour le stock de chaque article commandé
		for (const item of panier) {
			const id = item._id ? parseInt(item._id) : item.id_article;
			const article = await Article.findByPk(id, { transaction });

			if (article) {
				const newStock = article.stock - item.quantite;
				const disponibilite = newStock <= 0 ? "rupture" : "disponible";
				await article.update({ stock: newStock, disponibilite }, { transaction });
			}
		}

		// Tout s'est bien passé → on valide la transaction
		await transaction.commit();

		res.status(201).json({
			message: "Commande créée avec succès",
			id_commande: commande.id_commande,
			reference: commande.reference,
		});
	} catch (error) {
		// Une erreur est survenue → on annule TOUT
		await transaction.rollback();
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// PATCH - Modifier le statut d'une commande (admin uniquement)
router.patch("/:id/status", authenticateToken, isAdmin, async (req, res) => {
	try {
		const { status } = req.body;

		// Vérifier que le statut envoyé est valide
		const statusValides = ["en_attente", "confirmee", "expediee", "livree", "annulee"];
		if (!statusValides.includes(status)) {
			return res.status(400).json({ message: "❌ Statut invalide" });
		}

		const [affectedRows] = await Commande.update({ status }, { where: { id_commande: req.params.id } });

		if (affectedRows === 0) {
			return res.status(404).json({ message: "❌ Commande non trouvée" });
		}

		res.status(200).json({ message: "✅ Statut mis à jour" });
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

module.exports = router;
