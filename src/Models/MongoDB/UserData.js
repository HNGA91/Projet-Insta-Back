const mongoose = require("mongoose");

// Durée avant suppression automatique après la dernière activité (en secondes)
// 90 jours : suffisamment long pour ne jamais interférer avec une démo ou un usage normal
const TTL_INACTIVITE = 90 * 24 * 60 * 60; // 90 jours en secondes

const UserDataSchema = new mongoose.Schema({
	userEmail: {
		type: String,
		required: true,
		unique: true,
	},
	panier: [
		{
			_id: String,
			titre: String,
			marque: String,
			prix: Number,
			image: String,
			image_alt: String,
			// Titre du produit (catégorie) — stocké à plat car "produit" (objet imbriqué venant de MySQL)
			// n'est pas conservé par Mongoose. Sert à reconstruire le chemin de l'image après rechargement.
			produitTitre: String,
			id_article: Number,
			quantite: { type: Number, default: 1 },
		},
	],
	favoris: [
		{
			_id: String,
			titre: String,
			marque: String,
			prix: Number,
			image: String,
			image_alt: String,
			// Titre du produit (catégorie) — stocké à plat car "produit" (objet imbriqué venant de MySQL)
			// n'est pas conservé par Mongoose. Sert à reconstruire le chemin de l'image après rechargement.
			produitTitre: String,
			id_article: Number,
			stock: { type: Number, default: 0 },
			disponibilite: { type: String, default: "disponible" },
		},
	],
	lastUpdated: {
		type: Date,
		default: Date.now,
	},
});

// Rafraîchit lastUpdated à chaque mise à jour via findOneAndUpdate
// (utilisé par les routes PUT /userdata/:email/panier et /favoris)
// Sans ce hook, la date resterait figée à la création du document,
// et le TTL se déclencherait après 90 jours même pour un utilisateur actif.
UserDataSchema.pre("findOneAndUpdate", function (next) {
	this.set({ lastUpdated: new Date() });
	next();
});

module.exports = mongoose.model("UserData", UserDataSchema, "UserData");
