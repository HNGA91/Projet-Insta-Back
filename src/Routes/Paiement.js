const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const authenticateToken = require("../Middleware/Authentification");
const sequelize = require("../SequelizeDB");
const Commander = require("../Models/MySQL/Commander");
const Article = require("../Models/MySQL/Article");
const Adresse = require("../Models/MySQL/Adresse");
const { Op } = require("sequelize");
const { genererFacturePDF } = require("../Services/PdfService");
const { envoyerEmailConfirmationCommande } = require("../Services/EmailService");
const Utilisateur = require("../Models/MySQL/User");
const { paiementLimiter } = require("../Middleware/RateLimiter");

// Génère une référence unique — même logique que Commandes.js
const generateReference = () => {
	const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
	const random = Math.floor(1000 + Math.random() * 9000);
	return `CMD-${date}-${random}`;
};

// ===============================================================
// POST /api/paiement/create-checkout-session
// Crée une session Stripe Checkout et retourne l'URL de paiement
// ===============================================================
router.post("/create-checkout-session", paiementLimiter, authenticateToken, async (req, res) => {
	try {
		const { panier, id_adresse_livraison, id_adresse_facturation } = req.body;

		if (!panier || panier.length === 0) {
			return res.status(400).json({ message: "Le panier est vide" });
		}

		// Vérifier que les adresses appartiennent à l'utilisateur
		const adresseLivraison = await Adresse.findByPk(id_adresse_livraison);
		if (!adresseLivraison || adresseLivraison.id_user !== req.user.id_user) {
			return res.status(403).json({ message: "Adresse de livraison non autorisée" });
		}

		const adresseFacturation = await Adresse.findByPk(id_adresse_facturation);
		if (!adresseFacturation || adresseFacturation.id_user !== req.user.id_user) {
			return res.status(403).json({ message: "Adresse de facturation non autorisée" });
		}

		//  Vérifie le stock de chaque article
		for (const item of panier) {
			const id = item._id ? parseInt(item._id) : item.id_article;
			const article = await Article.findByPk(id);
			if (!article) {
				return res.status(404).json({ message: `Article introuvable : ${item.titre}` });
			}
			if (article.stock < item.quantite) {
				return res.status(400).json({
					message: `Stock insuffisant pour "${article.titre}" — disponible : ${article.stock}`,
				});
			}
		}

		// Construire les line_items Stripe depuis le panier
		// Stripe attend les montants en centimes (entiers)
		const lineItems = panier.map((item) => {
			// Le champ vient de MongoDB sous le nom "produitTitre", pas "produit"
			const dossierProduit = item.produitTitre || item.produit || "divers";

			// Encodage des segments d'URL : les noms de fichiers/dossiers contiennent
			// des espaces et parenthèses, invalides tels quels dans une URL Stripe
			const imageUrl = item.image
				? `${process.env.FRONTEND_URL}/Images/Articles/${encodeURIComponent(dossierProduit)}/${encodeURIComponent(item.image)}`
				: null;

			return {
				price_data: {
					currency: "eur",
					product_data: {
						name: item.titre || item.name || "Article",
						...(imageUrl && { images: [imageUrl] }),
					},
					unit_amount: Math.round(parseFloat(item.prix) * 100),
				},
				quantity: item.quantite || 1,
			};
		});

		// Créer la session Stripe Checkout
		const session = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],
			line_items: lineItems,
			mode: "payment",
			// URLs de redirection après paiement
			success_url: `${process.env.FRONTEND_URL}/paiement-success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${process.env.FRONTEND_URL}/paiement-cancel`,
			// Métadonnées transmises au webhook pour créer la commande
			metadata: {
				id_user: req.user.id_user.toString(),
				id_adresse_livraison: id_adresse_livraison.toString(),
				id_adresse_facturation: id_adresse_facturation.toString(),
				// On sérialise le panier en JSON pour le transmettre au webhook
				panier: JSON.stringify(panier),
			},
		});

		res.status(200).json({ url: session.url });
	} catch (error) {
		// Log complet côté serveur pour diagnostiquer les erreurs Stripe
		// (ex: URL d'image invalide, clé API incorrecte, etc.)
		console.error("❌ Erreur create-checkout-session:", error.message);
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// ===============================================================
// POST /api/paiement/webhook
// Reçoit les événements Stripe (paiement confirmé, etc.)
// Doit être en raw body — configuré dans ExpressApp.js
// ===============================================================
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
	const sig = req.headers["stripe-signature"];
	const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

	let event;
	try {
		event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
	} catch (err) {
		console.error("❌ Webhook signature invalide:", err.message);
		return res.status(400).send(`Webhook Error: ${err.message}`);
	}

	// Traiter uniquement les paiements réussis
	if (event.type === "checkout.session.completed") {
		const session = event.data.object;

		// Vérifier que le paiement est bien reçu
		if (session.payment_status !== "paid") {
			return res.status(200).json({ received: true });
		}

		const transaction = await sequelize.transaction();
		try {
			const { id_user, id_adresse_livraison, id_adresse_facturation, panier: panierJSON } = session.metadata;

			const panier = JSON.parse(panierJSON);
			const adresseLivraison = await Adresse.findByPk(id_adresse_livraison);
			const adresseFacturation = await Adresse.findByPk(id_adresse_facturation);

			const reference = generateReference();
			const montant = panier.reduce((acc, item) => acc + item.prix * item.quantite, 0);

			// Créer les lignes Commander
			const lignes = panier.map((item) => ({
				id_user: parseInt(id_user),
				id_article: item._id ? parseInt(item._id) : item.id_article,
				reference,
				adresseFacturation_rue: adresseFacturation.rue,
				adresseFacturation_ville: adresseFacturation.ville,
				adresseFacturation_cp: adresseFacturation.code_postal,
				adresseFacturation_pays: adresseFacturation.pays,
				adresseLivraison_rue: adresseLivraison.rue,
				adresseLivraison_ville: adresseLivraison.ville,
				adresseLivraison_cp: adresseLivraison.code_postal,
				adresseLivraison_pays: adresseLivraison.pays,
				quantite: item.quantite,
				prix_unitaire: item.prix,
				montant: parseFloat(montant.toFixed(2)),
				status: "confirmee",
			}));

			await Commander.bulkCreate(lignes, { transaction });

			// Mettre à jour le stock
			for (const item of panier) {
				const id = item._id ? parseInt(item._id) : item.id_article;
				const article = await Article.findByPk(id, { transaction });
				if (article) {
					const newStock = article.stock - item.quantite;
					const disponibilite = newStock <= 0 ? "rupture" : "disponible";
					await article.update({ stock: newStock, disponibilite }, { transaction });
				}
			}

			await transaction.commit();
			console.log(`✅ Commande ${reference} créée après paiement Stripe`);

			// ===== EMAIL + FACTURE PDF =====
			try {
				// Récupérer les infos du client pour la facture
				const client = await Utilisateur.findByPk(parseInt(id_user), {
					attributes: ["nom", "prenom", "email"],
				});

				// Récupérer les articles avec leurs titres depuis MySQL
				const lignesAvecArticles = await Promise.all(
					lignes.map(async (ligne) => {
						const article = await Article.findByPk(ligne.id_article, {
							attributes: ["titre"],
						});
						return { ...ligne, article: { titre: article?.titre || "Article" } };
					}),
				);

				const commandePourPDF = {
					reference: reference,
					dateCommande: new Date(),
					montant: parseFloat(montant.toFixed(2)),
					client: { nom: client.nom, prenom: client.prenom, email: client.email },
					adresseLivraison_rue: adresseLivraison.rue,
					adresseLivraison_ville: adresseLivraison.ville,
					adresseLivraison_cp: adresseLivraison.code_postal,
					adresseLivraison_pays: adresseLivraison.pays,
					adresseFacturation_rue: adresseFacturation.rue,
					adresseFacturation_ville: adresseFacturation.ville,
					adresseFacturation_cp: adresseFacturation.code_postal,
					adresseFacturation_pays: adresseFacturation.pays,
					lignes: lignesAvecArticles,
				};

				const pdfBuffer = await genererFacturePDF(commandePourPDF);
				await envoyerEmailConfirmationCommande(client.email, client.prenom, commandePourPDF, pdfBuffer);
				console.log(`✅ Email de confirmation envoyé à ${client.email}`);
			} catch (emailError) {
				// On ne fait pas échouer la commande si l'email plante
				console.error("❌ Erreur envoi email confirmation:", emailError.message);
			}
		} catch (error) {
			await transaction.rollback();
			console.error("❌ Erreur création commande webhook:", error.message);
			return res.status(500).json({ message: "Erreur création commande" });
		}
	}

	res.status(200).json({ received: true });
});

module.exports = router;
