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

// Association 1,n : une Adresse appartient à un seul Utilisateur
// Un Utilisateur peut posséder plusieurs Adresses (mais ne les partage pas)
Adresse.belongsTo(Utilisateur, { foreignKey: "id_user", as: "utilisateur" });
Utilisateur.hasMany(Adresse, { foreignKey: "id_user", as: "adresses" });

module.exports = Adresse;
