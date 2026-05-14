const { DataTypes } = require("sequelize");
const sequelize = require("../../SequelizeDB");

const LoginAttempts = sequelize.define(
	"LoginAttempts",
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		ip_adresse: {
			type: DataTypes.STRING(50),
			allowNull: false,
		},
		attemptCount: {
			type: DataTypes.INTEGER,
			defaultValue: 1,
		},
		lastAttemptAt: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW,
		},
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
