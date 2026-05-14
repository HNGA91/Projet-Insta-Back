const { DataTypes } = require("sequelize");
const sequelize = require("../../SequelizeDB");
const Utilisateur = require("./User");

const Commande = sequelize.define(
	"Commande",
	{
		id_commande: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		// Référence unique de la commande (ex: CMD-20260513-001)
		reference: {
			type: DataTypes.STRING(50),
			allowNull: false,
			unique: true,
		},
		// Snapshot de l'adresse au moment de la commande
		// On stocke l'adresse en texte pour figer la réalité du moment
		adresseLivraison_rue: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		adresseLivraison_ville: {
			type: DataTypes.STRING(100),
			allowNull: false,
		},
		adresseLivraison_cp: {
			type: DataTypes.STRING(10),
			allowNull: false,
		},
		adresseLivraison_pays: {
			type: DataTypes.STRING(100),
			allowNull: false,
		},
		dateCommande: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW,
		},
		status: {
			type: DataTypes.ENUM("en_attente", "confirmee", "expediee", "livree", "annulee"),
			defaultValue: "en_attente",
		},
		montant_total: {
			type: DataTypes.DECIMAL(10, 2),
			allowNull: false,
			defaultValue: 0,
		},
	},
	{
		tableName: "Commande",
		timestamps: false,
	},
);

// Association : une Commande appartient à un Utilisateur
// Un Utilisateur peut avoir plusieurs Commandes (0,n)
Commande.belongsTo(Utilisateur, { foreignKey: "id_user", as: "utilisateur" });
Utilisateur.hasMany(Commande, { foreignKey: "id_user", as: "commandes" });

module.exports = Commande;
