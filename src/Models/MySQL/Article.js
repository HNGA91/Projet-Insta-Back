const { DataTypes } = require("sequelize");
const sequelize = require("../../SequelizeDB");
const Produit = require("./Produit");

const Article = sequelize.define(
	"Article",
	{
		id_article: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		titre: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		marque: {
			type: DataTypes.STRING(100),
		},
		image: {
			type: DataTypes.STRING(500),
		},
		image_alt: {
			type: DataTypes.STRING(255),
		},
		description: {
			type: DataTypes.STRING(255),
		},
		stock: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		disponibilite: {
			type: DataTypes.ENUM("disponible", "indisponible", "rupture"),
			defaultValue: "disponible",
		},
		prix: {
			type: DataTypes.DECIMAL(10, 2),
			allowNull: false,
		},
	},
	{
		tableName: "Article",
		timestamps: false,
	},
);

// Association : un Article appartient à un Produit
Article.belongsTo(Produit, { foreignKey: "id_produit", as: "produit" });
Produit.hasMany(Article, { foreignKey: "id_produit", as: "articles" });

module.exports = Article;
