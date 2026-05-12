const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getUserByEmail, createUser, updateLastLogin } = require("../Models/User");

// POST - Inscription
router.post("/inscription", async (req, res) => {
	try {
		const { nom, prenom, email, tel, password } = req.body;

		// Vérifier si l'email existe déjà
		const existingUser = await getUserByEmail(email);
		if (existingUser) {
			return res.status(409).json({ message: "Cet email est déjà utilisé" });
		}

		// Hasher le mot de passe
		const hashedPassword = await bcrypt.hash(password, 10);

		// Créer l'utilisateur
		const insertId = await createUser({
			nom,
			prenom,
			email,
			tel,
			role: "client",
			password: hashedPassword,
		});

		res.status(201).json({ message: "Inscription réussie", id_user: insertId });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// POST - Connexion
router.post("/connexion", async (req, res) => {
	try {
		const { email, password, lastLoginFrom } = req.body;

		// Vérifier si l'utilisateur existe
		const user = await getUserByEmail(email);
		if (!user) {
			return res.status(401).json({ message: "Email ou mot de passe incorrect" });
		}

		// Vérifier le mot de passe
		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			return res.status(401).json({ message: "Email ou mot de passe incorrect" });
		}

		// Mettre à jour la dernière connexion
		await updateLastLogin(user.id_user, lastLoginFrom || "web");

		// Générer le token JWT
		const token = jwt.sign({ id_user: user.id_user, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "24h" });

		res.status(200).json({
			message: "Connexion réussie",
			token,
			user: {
				id_user: user.id_user,
				nom: user.nom,
				prenom: user.prenom,
				email: user.email,
				role: user.role,
			},
		});
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

module.exports = router;
