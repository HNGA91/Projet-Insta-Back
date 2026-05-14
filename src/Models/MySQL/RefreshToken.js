const { DataTypes } = require("sequelize");
const sequelize = require("../../SequelizeDB");
const Utilisateur = require("./User");

const RefreshToken = sequelize.define(
	"RefreshToken",
	{
		id_token: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		token_hash: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		createdAt: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW,
		},
		revokedAt: {
			type: DataTypes.DATE,
			defaultValue: null,
		},
		expireAt: {
			type: DataTypes.DATE,
			allowNull: false,
		},
	},
	{
		tableName: "RefreshToken",
		timestamps: false,
	},
);

// Association : un RefreshToken appartient à un Utilisateur
RefreshToken.belongsTo(Utilisateur, { foreignKey: "id_user", as: "utilisateur" });
Utilisateur.hasMany(RefreshToken, { foreignKey: "id_user", as: "refreshTokens" });

module.exports = RefreshToken;
