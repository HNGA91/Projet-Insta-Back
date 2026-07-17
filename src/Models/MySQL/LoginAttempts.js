// Stocke les tentatives de connexion échouées
// Permet de bloquer une IP ET un compte après trop de tentatives (brute force)
const { DataTypes } = require("sequelize");
const sequelize = require("../../SequelizeDB");

const LoginAttempts = sequelize.define(
	"LoginAttempts",
	{
		// Identifiant unique auto-incrémenté
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		// Adresse IP de la tentative
		ip_adresse: {
			type: DataTypes.STRING(50),
			allowNull: false,
		},
		// Email utilisé lors de la tentative
		// Permet de bloquer le compte en plus de l'IP
		email: {
			type: DataTypes.STRING(191),
			defaultValue: null,
		},
		// id_user si l'email correspond à un utilisateur existant
		// Nullable car l'email peut ne pas correspondre à un compte
		id_user: {
			type: DataTypes.INTEGER,
			defaultValue: null,
		},
		// Nombre de tentatives échouées
		attemptCount: {
			type: DataTypes.INTEGER,
			defaultValue: 1,
		},
		// Date de la dernière tentative
		lastAttemptAt: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW,
		},
		// Date jusqu'à laquelle le compte/IP est bloqué
		lockedUntil: {
			type: DataTypes.DATE,
			defaultValue: null,
		},
	},
	{
		tableName: "LoginAttempts",
		timestamps: false,
	},
);

module.exports = LoginAttempts;
