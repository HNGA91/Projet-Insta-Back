// Table de jonction enrichie entre Utilisateur et Article
// Représente une ligne de commande — une commande avec plusieurs articles
// aura plusieurs lignes avec le même id_commande et reference
const { DataTypes } = require("sequelize");
const sequelize = require("../../SequelizeDB");
const Utilisateur = require("./User");
const Article = require("./Article");

const Commander = sequelize.define(
	"Commander",
	{
		// Identifiant unique auto-incrémenté de la ligne de commande
		id_commande: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		// Référence commune à toutes les lignes d'une même commande
		// ex: CMD-20260514-1234 — permet de regrouper les lignes
		reference: {
			type: DataTypes.STRING(50),
			allowNull: false,
		},
		// ===== SNAPSHOT ADRESSE FACTURATION =====
		// Copie figée de l'adresse au moment de la commande
		adresseFacturation_rue: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		adresseFacturation_ville: {
			type: DataTypes.STRING(100),
			allowNull: false,
		},
		adresseFacturation_cp: {
			type: DataTypes.STRING(10),
			allowNull: false,
		},
		adresseFacturation_pays: {
			type: DataTypes.STRING(100),
			allowNull: false,
		},
		// ===== SNAPSHOT ADRESSE LIVRAISON =====
		adresseLivraison_rue: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		adresseLivraison_ville: {
			type: DataTypes.STRING(100),
			allowNull: false,
		},
		adresseLivraison_cp: {
			type: DataTypes.STRING(10),
			allowNull: false,
		},
		adresseLivraison_pays: {
			type: DataTypes.STRING(100),
			allowNull: false,
		},
		// Quantité de cet article dans la commande
		quantite: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 1,
		},
		// Prix unitaire figé au moment de la commande
		// Ne pas utiliser le prix actuel de l'article car il peut changer
		prix_unitaire: {
			type: DataTypes.DECIMAL(10, 2),
			allowNull: false,
		},
		// Date de la commande — automatique
		dateCommande: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW,
		},
		// Statut de la commande
		status: {
			type: DataTypes.ENUM("en_attente", "confirmee", "expediee", "livree", "annulee"),
			defaultValue: "en_attente",
		},
		// Montant total de la commande (somme de tous les articles)
		montant: {
			type: DataTypes.DECIMAL(10, 2),
			allowNull: false,
			defaultValue: 0,
		},
	},
	{
		tableName: "Commander",
		timestamps: false,
	},
);

// Association : une ligne de commande appartient à un Utilisateur
Commander.belongsTo(Utilisateur, { foreignKey: "id_user", as: "utilisateur" });
Utilisateur.hasMany(Commander, { foreignKey: "id_user", as: "commandes" });

// Association : une ligne de commande référence un Article
Commander.belongsTo(Article, { foreignKey: "id_article", as: "article" });
Article.hasMany(Commander, { foreignKey: "id_article", as: "lignes" });

module.exports = Commander;
