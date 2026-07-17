const express = require("express");
const router = express.Router();
const sequelize = require("../SequelizeDB");
const Commander = require("../Models/MySQL/Commander");
const Utilisateur = require("../Models/MySQL/User");
const Article = require("../Models/MySQL/Article");
const Adresse = require("../Models/MySQL/Adresse");
const authenticateToken = require("../Middleware/Authentification");
const isAdmin = require("../Middleware/IsAdmin");
const { Op } = require("sequelize");
const { genererFacturePDF } = require("../Services/PdfService");

// =============== FONCTION UTILITAIRE ===============

// Génère une référence unique pour chaque commande
// Format : CMD-YYYYMMDD-XXXX (ex: CMD-20260514-4521)
const generateReference = () => {
	const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
	const random = Math.floor(1000 + Math.random() * 9000);
	return `CMD-${date}-${random}`;
};

// =============== ROUTES ===============

// GET - Récupérer toutes les commandes (admin uniquement)
// Regroupe les lignes par référence pour afficher une commande complète
router.get("/", authenticateToken, isAdmin, async (req, res) => {
	try {
		const commandes = await Commander.findAll({
			include: [
				{
					model: Article,
					as: "article",
					// On récupère uniquement les infos essentielles de l'article
					attributes: ["id_article", "titre", "image", "prix"],
				},
				{
					model: Utilisateur,
					as: "utilisateur",
					attributes: ["email"],
				},
			],
			// Trier par date décroissante (plus récente en premier)
			order: [["dateCommande", "DESC"]],
		});
		res.status(200).json(commandes);
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// GET - Récupérer toutes les commandes d'un utilisateur
// Accessible par l'utilisateur lui-même ou un admin
router.get("/user/:id_user", authenticateToken, async (req, res) => {
	try {
		// Vérifier que c'est l'utilisateur lui-même ou un admin
		if (req.user.id_user !== parseInt(req.params.id_user) && req.user.role !== "admin") {
			return res.status(403).json({ message: "Accès non autorisé" });
		}

		const commandes = await Commander.findAll({
			where: { id_user: req.params.id_user },
			include: [
				{
					model: Article,
					as: "article",
					attributes: ["id_article", "titre", "image", "prix"],
				},
				{
					model: Utilisateur,
					as: "utilisateur",
					attributes: ["email"],
				},
			],
			order: [["dateCommande", "DESC"]],
		});

		res.status(200).json(commandes);
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// GET - Récupérer une commande par référence
// Retourne toutes les lignes d'une même commande
router.get("/reference/:reference", authenticateToken, async (req, res) => {
	try {
		const lignes = await Commander.findAll({
			where: { reference: req.params.reference },
			include: [
				{
					model: Article,
					as: "article",
					attributes: ["id_article", "titre", "image", "prix"],
				},
				{
					model: Utilisateur,
					as: "utilisateur",
					attributes: ["email"],
				},
			],
		});

		if (lignes.length === 0) {
			return res.status(404).json({ message: "Commande non trouvée" });
		}

		// Vérifier que c'est la commande de l'utilisateur connecté ou un admin
		if (lignes[0].id_user !== req.user.id_user && req.user.role !== "admin") {
			return res.status(403).json({ message: "Accès non autorisé" });
		}

		res.status(200).json(lignes);
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// GET - Télécharger la facture d'une commande
router.get("/reference/:reference/facture", authenticateToken, async (req, res) => {
    try {
        const { reference } = req.params;

        // Récupérer les lignes de la commande
        const lignes = await Commander.findAll({
            where: { reference, id_user: req.user.id_user },
            include: [{ model: Article, as: "article", attributes: ["titre"] }],
        });

        if (!lignes || lignes.length === 0) {      
            return res.status(404).json({ message: "Commande introuvable" });
        }

        const client = await Utilisateur.findByPk(req.user.id_user, {
            attributes: ["nom", "prenom", "email"],
        });

        const commandePourPDF = {
            reference,
            dateCommande:             lignes[0].dateCommande,
            montant:                  lignes[0].montant,
            client:                   { nom: client.nom, prenom: client.prenom, email: client.email },
            adresseLivraison_rue:     lignes[0].adresseLivraison_rue,
            adresseLivraison_ville:   lignes[0].adresseLivraison_ville,
            adresseLivraison_cp:      lignes[0].adresseLivraison_cp,
            adresseLivraison_pays:    lignes[0].adresseLivraison_pays,
            adresseFacturation_rue:   lignes[0].adresseFacturation_rue,
            adresseFacturation_ville: lignes[0].adresseFacturation_ville,
            adresseFacturation_cp:    lignes[0].adresseFacturation_cp,
            adresseFacturation_pays:  lignes[0].adresseFacturation_pays,
            lignes:                   lignes.map((l) => ({
                quantite:      l.quantite,
                prix_unitaire: l.prix_unitaire,
                article:       l.article,
            })),
        };

        const pdfBuffer = await genererFacturePDF(commandePourPDF);

        // Envoyer le PDF directement au navigateur
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="facture-${reference}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
});

// POST - Créer une nouvelle commande
router.post("/", authenticateToken, async (req, res) => {
	// Transaction pour garantir l'intégrité des données
	// Si une étape échoue, TOUT est annulé
	const transaction = await sequelize.transaction();

	try {
		const { id_adresse_livraison, id_adresse_facturation, panier } = req.body;

		// Vérifier que le panier n'est pas vide
		if (!panier || panier.length === 0) {
			await transaction.rollback();
			return res.status(400).json({ message: "Le panier est vide" });
		}

		// Récupérer et vérifier l'adresse de livraison
		const adresseLivraison = await Adresse.findByPk(id_adresse_livraison);
		if (!adresseLivraison) {
			await transaction.rollback();
			return res.status(404).json({ message: "Adresse de livraison non trouvée" });
		}

		// Vérifier que l'adresse de livraison appartient bien à l'utilisateur connecté
		if (adresseLivraison.id_user !== req.user.id_user) {
			await transaction.rollback();
			return res.status(403).json({ message: "Adresse de livraison non autorisée" });
		}

		// Récupérer et vérifier l'adresse de facturation
		const adresseFacturation = await Adresse.findByPk(id_adresse_facturation);
		if (!adresseFacturation) {
			await transaction.rollback();
			return res.status(404).json({ message: "Adresse de facturation non trouvée" });
		}

		// Vérifier que l'adresse de facturation appartient bien à l'utilisateur connecté
		if (adresseFacturation.id_user !== req.user.id_user) {
			await transaction.rollback();
			return res.status(403).json({ message: "Adresse de facturation non autorisée" });
		}

		// Générer une référence unique pour toutes les lignes de cette commande
		const reference = generateReference();

		// Calculer le montant total de la commande
		const montant = panier.reduce((acc, item) => acc + item.prix * item.quantite, 0);

		// Créer une ligne Commander pour chaque article du panier
		const lignes = panier.map((item) => ({
			id_user: req.user.id_user,
			id_article: item._id ? parseInt(item._id) : item.id_article,
			reference,
			// Snapshot adresse facturation
			adresseFacturation_rue: adresseFacturation.rue,
			adresseFacturation_ville: adresseFacturation.ville,
			adresseFacturation_cp: adresseFacturation.code_postal,
			adresseFacturation_pays: adresseFacturation.pays,
			// Snapshot adresse livraison
			adresseLivraison_rue: adresseLivraison.rue,
			adresseLivraison_ville: adresseLivraison.ville,
			adresseLivraison_cp: adresseLivraison.code_postal,
			adresseLivraison_pays: adresseLivraison.pays,
			quantite: item.quantite,
			// Prix figé au moment de la commande
			prix_unitaire: item.prix,
			montant: parseFloat(montant.toFixed(2)),
		}));

		// Insérer toutes les lignes en une seule requête (plus performant)
		await Commander.bulkCreate(lignes, { transaction });

		// Mettre à jour le stock de chaque article commandé
		for (const item of panier) {
			const id = item._id ? parseInt(item._id) : item.id_article;
			const article = await Article.findByPk(id, { transaction });

			if (article) {
				const newStock = article.stock - item.quantite;
				// Mettre à jour la disponibilité selon le nouveau stock
				const disponibilite = newStock <= 0 ? "rupture" : "disponible";
				await article.update({ stock: newStock, disponibilite }, { transaction });
			}
		}

		// Tout s'est bien passé → valider la transaction
		await transaction.commit();

		res.status(201).json({
			message: "✅ Commande créée avec succès",
			reference,
			montant: parseFloat(montant.toFixed(2)),
		});
	} catch (error) {
		// Une erreur est survenue → annuler TOUT
		await transaction.rollback();
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// PATCH - Modifier le statut d'une commande (admin uniquement)
router.patch("/reference/:reference/status", authenticateToken, isAdmin, async (req, res) => {
	try {
		const { status } = req.body;

		// Vérifier que le statut envoyé est valide
		const statusValides = ["en_attente", "confirmee", "expediee", "livree", "annulee"];
		if (!statusValides.includes(status)) {
			return res.status(400).json({ message: "Statut invalide" });
		}

		// Mettre à jour toutes les lignes de la commande (même référence)
		const [affectedRows] = await Commander.update({ status }, { where: { reference: req.params.reference } });

		if (affectedRows === 0) {
			return res.status(404).json({ message: "Commande non trouvée" });
		}

		res.status(200).json({ message: "✅ Statut mis à jour" });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

module.exports = router;
