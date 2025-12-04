const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../Models/User");

if (!process.env.JWT_SECRET) {
	console.error("❌ ERREUR CRITIQUE: JWT_SECRET n'est pas défini dans .env");
	// Ne pas quitter le processus, mais logger l'erreur
}

// POST /api/auth/login - Route de connexion
router.post("/login", async (req, res) => {
	try {
		const { email, password, source } = req.body;

		// 1. Vérifier l'utilisateur dans votre base
		const user = await User.findOne({ Email: email.toLowerCase() });
		if (!user) {
			return res.status(401).json({
				success: false,
				message: "❌ Email ou mot de passe incorrect",
			});
		}

		// 2. Vérifier le mot de passe
		const validPassword = await user.comparePassword(password);

		if (!validPassword) {
			return res.status(401).json({
				success: false,
				message: "❌ Email ou mot de passe incorrect",
			});
		}

		// 3. Mettre à jour les infos de connexion
		user.lastLoginFrom = source || "web";
		user.lastLoginAt = new Date();
		await user.save();

		// 4. Créer le token JWT
		const userPayload = {
			email: user.Email,
			id: user._id,
			nom: user.Nom,
			prenom: user.Prenom,
		};

		// Vérification de JWT_SECRET
		if (!process.env.JWT_SECRET) {
			console.error("❌ JWT_SECRET manquant");
			return res.status(500).json({
				success: false,
				message: "Erreur de configuration serveur",
			});
		}

		const token = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: "24h" });

		// 5. Retourner la réponse
		res.json({
			success: true,
			message: "✅ Connexion réussie",
			token: token,
			user: userPayload,
		});
	} catch (error) {
		console.error("❌ Erreur connexion:", error);
		res.status(500).json({
			success: false,
			message: "Erreur serveur",
		});
	}
});

// POST /api/auth/inscription - Route de inscription
router.post("/inscription", async (req, res) => {
	try {
		const { nom, prenom, email, tel, password, source } = req.body;

		// Vérifier si l'utilisateur existe déjà
		const existingUser = await User.findOne({ Email: email.toLowerCase() });
		if (existingUser) {
			return res.status(400).json({
				success: false,
				message: "❌ Cet email est déjà utilisé",
			});
		}

		// Créer le nouvel utilisateur
		const newUser = new User({
			Nom: nom,
			Prenom: prenom,
			Email: email.toLowerCase(),
			Tel: tel,
			Password: password, // Le middleware pre("save") le hash automatiquement
			lastLoginFrom: source || "web",
			lastLoginAt: new Date(),
		});

		await newUser.save();

		// Connexion automatique après inscription
		const userPayload = {
			email: newUser.Email,
			id: newUser._id,
			nom: newUser.Nom,
			prenom: newUser.Prenom,
		};

		// Vérification de JWT_SECRET
		if (!process.env.JWT_SECRET) {
			console.error("❌ JWT_SECRET manquant");
			return res.status(500).json({
				success: false,
				message: "Erreur de configuration serveur",
			});
		}

		const token = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: "24h" });

		res.json({
			success: true,
			message: "✅ Inscription réussie",
			token: token,
			user: userPayload,
		});
	} catch (error) {
		console.error("❌ Erreur inscription:", error);
		res.status(500).json({
			success: false,
			message: "Erreur serveur lors de l'inscription",
		});
	}
});

module.exports = router;
