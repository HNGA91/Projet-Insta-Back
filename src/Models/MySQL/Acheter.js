// Table de jonction entre Commande et Article
// Représente les lignes d'une commande (ce qui a été acheté)
const { DataTypes } = require("sequelize");
const sequelize = require("../../SequelizeDB");
const Commande = require("./Commande");
const Article = require("./Article");

const Acheter = sequelize.define(
	"Acheter",
	{
		// Identifiant unique auto-incrémenté
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		// Quantité achetée de cet article
		quantite: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 1,
		},
		// Prix unitaire au moment de la commande
		// Figé pour éviter les variations de prix après achat
		prix_unitaire: {
			type: DataTypes.DECIMAL(10, 2),
			allowNull: false,
		},
	},
	{
		tableName: "acheter",
		timestamps: false,
	},
);

// Association : une ligne appartient à une Commande
// Si la commande est supprimée, les lignes le sont aussi (CASCADE)
Acheter.belongsTo(Commande, { foreignKey: "id_commande", as: "commande" });
Commande.hasMany(Acheter, { foreignKey: "id_commande", as: "lignes" });

// Association : une ligne référence un Article
// Si l'article est supprimé, la ligne reste mais sans référence (SET NULL)
Acheter.belongsTo(Article, { foreignKey: "id_article", as: "article" });
Article.hasMany(Acheter, { foreignKey: "id_article", as: "lignes" });

module.exports = Acheter;
