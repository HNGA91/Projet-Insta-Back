const { DataTypes } = require("sequelize");
const sequelize = require("../../SequelizeDB");

const Produit = sequelize.define(
	"Produit",
	{
		id_produit: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		titre: {
			type: DataTypes.STRING(150),
			allowNull: false,
		},
		image: {
			type: DataTypes.STRING(500),
		},
		image_alt: {
			type: DataTypes.STRING(255),
		},
	},
	{
		tableName: "Produit",
		timestamps: false,
	},
);

module.exports = Produit;
