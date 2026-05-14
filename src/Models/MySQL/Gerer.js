// Table de jonction entre Utilisateur et Adresse
const { DataTypes } = require("sequelize");
const sequelize = require("../../SequelizeDB");
const Utilisateur = require("./User");
const Adresse = require("./Adresse");

const Gerer = sequelize.define(
	"Gerer",
	{
		// Clé primaire composée — empêche les doublons
		id_user: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			references: { model: Utilisateur, key: "id_user" },
		},
		id_adresse: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			references: { model: Adresse, key: "id_adresse" },
		},
	},
	{
		tableName: "gerer",
		timestamps: false,
	},
);

// Association n,n : un utilisateur peut avoir plusieurs adresses
// et une adresse peut appartenir à plusieurs utilisateurs (ne peut pas exister seule)
Utilisateur.belongsToMany(Adresse, {
	through: Gerer,
	foreignKey: "id_user",
	as: "adresses",
});

Adresse.belongsToMany(Utilisateur, {
	through: Gerer,
	foreignKey: "id_adresse",
	as: "utilisateurs",
});

module.exports = Gerer;
