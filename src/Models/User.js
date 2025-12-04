const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
	Nom: {
		type: String,
		required: true,
	},
	Prenom: {
		type: String,
		required: true,
	},
	Email: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
	},
	Tel: {
		type: String,
		required: true,
	},
	Password: {
		type: String,
		required: true,
	},
	dateInscription: {
		type: Date,
		default: Date.now,
	},
	lastLoginFrom: {
		type: String,
		enum: ["web", "mobile"],
	},
	lastLoginAt: {
		type: Date,
	},
});

// Middleware pour hasher le mot de passe avant sauvegarde
UserSchema
	// S'exécute automatiquement avant que l'utilisateur soit sauvegardé dans la base
	.pre("save", async function (next) {
        // Vérifie: "Est-ce que le mot de passe a été modifié ?";
		if (!this.isModified("Password")) return next();

		try {
			//Génère un "sel" cryptographique
			// Sel = chaîne aléatoire unique pour chaque utilisateur
			// 10 = coût du hash (plus élevé = plus sécurisé mais plus lent)
			const salt = await bcrypt.genSalt(10);
			// this = l'utilisateur en cours de création/modification
			this.Password = await bcrypt.hash(this.Password, salt);
			next(); // Passe au prochain middleware ou sauvegarde
		} catch (error) {
			next(error); // si il y a une erreur
		}
	});

// Méthode pour vérifier le mot de passe
UserSchema.methods.comparePassword = async function (candidatePassword) {
	return await bcrypt.compare(candidatePassword, this.Password);
	// Compare un mot de passe en clair avec un hash stocké, Ne déchiffre pas le hash (impossible)
	// Hash le mot de passe candidat avec le même sel → compare les hashs
};

module.exports = mongoose.model("User", UserSchema, "Users");
