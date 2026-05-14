const { DataTypes } = require("sequelize");
const sequelize = require("../../SequelizeDB");

const Utilisateur = sequelize.define(
	"Utilisateur",
	{
		id_user: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		nom: {
			type: DataTypes.STRING(100),
			allowNull: false,
		},
		prenom: {
			type: DataTypes.STRING(100),
			allowNull: false,
		},
		email: {
			type: DataTypes.STRING(191),
			allowNull: false,
			unique: true,
		},
		tel: {
			type: DataTypes.STRING(20),
		},
		role: {
			type: DataTypes.ENUM("client", "admin"),
			defaultValue: "client",
		},
		password: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		lastLoginFrom: {
			type: DataTypes.STRING(50),
		},
		lastLoginAt: {
			type: DataTypes.DATE,
		},
		dateInscription: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW,
		},
	},
	{
		tableName: "Utilisateur",
		timestamps: false, // On gère dateInscription manuellement
	},
);

module.exports = Utilisateur;
