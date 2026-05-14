const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Utilisateur = require("../Models/MySQL/User");
const RefreshToken = require("../Models/MySQL/RefreshToken");
const LoginAttempts = require("../Models/MySQL/LoginAttempts");
const { Op } = require("sequelize");

// =============== CONSTANTES ===============

const MAX_ATTEMPTS = 3; // Nombre max de tentatives avant blocage
const LOCK_DURATION = 5; // Durée du blocage en minutes
const REFRESH_TOKEN_EXPIRY = 7; // Durée de vie du Refresh Token en jours

// =============== FONCTIONS UTILITAIRES ===============

// Récupère l'IP réelle du client
const getClientIp = (req) => {
	return req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
};

// Vérifie si une IP est bloquée
const isIpBlocked = async (ip) => {
	const attempt = await LoginAttempts.findOne({ where: { ip_adresse: ip } });
	if (!attempt) return false;
	if (attempt.lockedUntil && new Date() < new Date(attempt.lockedUntil)) {
		return true; // IP encore bloquée
	}
	return false;
};

// Enregistre une tentative échouée
const recordFailedAttempt = async (ip) => {
	const attempt = await LoginAttempts.findOne({ where: { ip_adresse: ip } });

	if (!attempt) {
		// Première tentative échouée
		await LoginAttempts.create({ ip_adresse: ip, attemptCount: 1 });
		return;
	}

	const newCount = attempt.attemptCount + 1;

	if (newCount >= MAX_ATTEMPTS) {
		// Bloquer l'IP
		const lockedUntil = new Date(Date.now() + LOCK_DURATION * 60 * 1000);
		await attempt.update({ attemptCount: newCount, lockedUntil, lastAttemptAt: new Date() });
	} else {
		await attempt.update({ attemptCount: newCount, lastAttemptAt: new Date() });
	}
};

// Réinitialise les tentatives après une connexion réussie
const resetAttempts = async (ip) => {
	await LoginAttempts.destroy({ where: { ip_adresse: ip } });
};

// Génère un Access Token (courte durée)
const generateAccessToken = (user) => {
	return jwt.sign({ id_user: user.id_user, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "5m" });
};

// Génère et sauvegarde un Refresh Token (longue durée)
const generateRefreshToken = async (user) => {
	// Générer un token aléatoire sécurisé
	const rawToken = crypto.randomBytes(64).toString("hex");

	// Hasher le token avant de le stocker en BDD
	const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

	// Calculer la date d'expiration
	const expireAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 24 * 60 * 60 * 1000);

	// Sauvegarder en BDD
	await RefreshToken.create({
		token_hash: tokenHash,
		id_user: user.id_user,
		expireAt,
	});

	// Retourner le token brut (envoyé au client, jamais stocké tel quel en BDD)
	return rawToken;
};

// =============== ROUTES ===============

// POST - Inscription
router.post("/inscription", async (req, res) => {
	try {
		const { nom, prenom, email, tel, password } = req.body;

		// Vérifier si l'email existe déjà
		const existingUser = await Utilisateur.findOne({ where: { email } });
		if (existingUser) {
			return res.status(409).json({ message: "⚠️ Cet email est déjà utilisé" });
		}

		// Hasher le mot de passe
		const hashedPassword = await bcrypt.hash(password, 10);

		// Créer l'utilisateur
		const user = await Utilisateur.create({
			nom,
			prenom,
			email,
			tel,
			role: "client",
			password: hashedPassword,
		});

		res.status(201).json({ message: "✅ Inscription réussie", id_user: user.id_user });
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// POST - Connexion
router.post("/connexion", async (req, res) => {
	try {
		const { email, password, lastLoginFrom } = req.body;
		const ip = getClientIp(req);

		// 1. Vérifier si l'IP est bloquée
		const blocked = await isIpBlocked(ip);
		if (blocked) {
			return res.status(429).json({
				message: `⚠️ Trop de tentatives échouées. Réessayez dans ${LOCK_DURATION} minutes.`,
			});
		}

		// 2. Vérifier si l'utilisateur existe
		const user = await Utilisateur.findOne({ where: { email } });
		if (!user) {
			await recordFailedAttempt(ip);
			return res.status(401).json({ message: "❌ Email ou mot de passe incorrect" });
		}

		// 3. Vérifier le mot de passe
		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			await recordFailedAttempt(ip);
			return res.status(401).json({ message: "❌ Email ou mot de passe incorrect" });
		}

		// 4. Connexion réussie → réinitialiser les tentatives
		await resetAttempts(ip);

		// 5. Mettre à jour la dernière connexion
		await user.update({ lastLoginFrom: lastLoginFrom || "web", lastLoginAt: new Date() });

		// 6. Générer les tokens
		const accessToken = generateAccessToken(user);
		const refreshToken = await generateRefreshToken(user);

		// 7. Envoyer le Refresh Token dans un cookie HTTP-only
		res.cookie("refreshToken", refreshToken, {
			httpOnly: true, // Inaccessible depuis JavaScript
			secure: true, // HTTPS actif aussi bien en dev qu'en prod grâce à mkcert
			sameSite: "strict", // Protection contre les attaques CSRF (Cross-Site Request Forgery). Cookie envoyé uniquement si la requête vient exactement du même site
			maxAge: REFRESH_TOKEN_EXPIRY * 24 * 60 * 60 * 1000,
		});

		res.status(200).json({
			message: "✅ Connexion réussie",
			accessToken,
			user: {
				id_user: user.id_user,
				nom: user.nom,
				prenom: user.prenom,
				email: user.email,
				role: user.role,
			},
		});
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// POST - Rafraîchir l'Access Token
router.post("/refresh", async (req, res) => {
	try {
		// 1. Récupérer le Refresh Token depuis le cookie
		const rawToken = req.cookies?.refreshToken;
		if (!rawToken) {
			return res.status(401).json({ message: "⚠️ Refresh Token manquant" });
		}

		// 2. Hasher le token reçu pour comparer avec la BDD
		const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

		// 3. Chercher le token en BDD
		const storedToken = await RefreshToken.findOne({
			where: {
				token_hash: tokenHash,
				revokedAt: null, // Non révoqué
				expireAt: { [Op.gt]: new Date() }, // Non expiré
			},
			include: [{ model: Utilisateur, as: "utilisateur" }],
		});

		if (!storedToken) {
			return res.status(403).json({ message: "❌ Refresh Token invalide ou expiré" });
		}

		// 4. Générer un nouvel Access Token
		const accessToken = generateAccessToken(storedToken.utilisateur);

		res.status(200).json({ accessToken });
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

// POST - Déconnexion
router.post("/deconnexion", async (req, res) => {
	try {
		const rawToken = req.cookies?.refreshToken;

		if (rawToken) {
			// Révoquer le Refresh Token en BDD
			const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
			await RefreshToken.update({ revokedAt: new Date() }, { where: { token_hash: tokenHash } });
		}

		// Supprimer le cookie
		res.clearCookie("refreshToken");
		res.status(200).json({ message: "✅ Déconnexion réussie" });
	} catch (error) {
		res.status(500).json({ message: "❌ Erreur serveur", error: error.message });
	}
});

module.exports = router;
