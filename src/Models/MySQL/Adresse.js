const { DataTypes } = require("sequelize");
const sequelize = require("../../SequelizeDB");
const Utilisateur = require("./User");

const Adresse = sequelize.define(
	"Adresse",
	{
		id_adresse: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		rue: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		ville: {
			type: DataTypes.STRING(100),
			allowNull: false,
		},
		code_postal: {
			type: DataTypes.STRING(10),
			allowNull: false,
		},
		pays: {
			type: DataTypes.STRING(100),
			allowNull: false,
			defaultValue: "France",
		},
	},
	{
		tableName: "Adresse",
		timestamps: false,
	},
);

// Association : une Adresse appartient à un Utilisateur
// Un Utilisateur peut avoir plusieurs Adresses (0,n)
Adresse.belongsTo(Utilisateur, { foreignKey: "id_user", as: "utilisateur" });
Utilisateur.hasMany(Adresse, { foreignKey: "id_user", as: "adresses" });

module.exports = Adresse;
