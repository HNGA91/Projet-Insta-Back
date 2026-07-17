// Stocke les tokens temporaires de réinitialisation de mot de passe
// Relation 1,n avec Utilisateur : un utilisateur peut avoir plusieurs tokens
// (s'il fait plusieurs demandes), mais chaque token appartient à un seul utilisateur
const { DataTypes } = require("sequelize");
const sequelize = require("../../SequelizeDB");
const Utilisateur = require("./User");

const ResetPassword = sequelize.define(
	"ResetPassword",
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		// Token hashé en SHA-256 — jamais stocké en clair
		token_hash: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		// Date d'expiration — 30 minutes après création
		expireAt: {
			type: DataTypes.DATE,
			allowNull: false,
		},
		// Indique si le token a déjà été utilisé
		// Un token ne peut servir qu'une seule fois
		utilise: {
			type: DataTypes.TINYINT,
			defaultValue: 0,
		},
	},
	{
		tableName: "ResetPassword",
		timestamps: false,
	},
);

// Association 1,n : un Utilisateur peut avoir plusieurs tokens de reset
ResetPassword.belongsTo(Utilisateur, { foreignKey: "id_user", as: "utilisateur" });
Utilisateur.hasMany(ResetPassword, { foreignKey: "id_user", as: "resetTokens" });

module.exports = ResetPassword;
