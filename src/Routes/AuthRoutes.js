const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Utilisateur = require("../Models/MySQL/User");
const RefreshToken = require("../Models/MySQL/RefreshToken");
const LoginAttempts = require("../Models/MySQL/LoginAttempts");
const { Op } = require("sequelize");
const ResetPassword = require("../Models/MySQL/ResetPassword");
const { envoyerEmailReset } = require("../Services/EmailService");
const { resetPasswordLimiter } = require("../Middleware/RateLimiter");

// =============== CONSTANTES ===============

const MAX_ATTEMPTS = 3; // Nombre max de tentatives avant blocage
const LOCK_DURATION = 15; // Durée du blocage en minutes
const REFRESH_TOKEN_EXPIRY = 7; // Durée de vie du Refresh Token en jours

// =============== FONCTIONS UTILITAIRES ===============

// Récupère l'IP réelle du client
// x-forwarded-for est utilisé quand le serveur est derrière un proxy/nginx
const getClientIp = (req) => {
	const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
	// Normaliser ::1 (IPv6 localhost) en 127.0.0.1 (IPv4 localhost)
	return ip === "::1" ? "127.0.0.1" : ip;
};

// Vérifie si une IP OU un email est bloqué
const isBlocked = async (ip, email) => {
	// Vérifier le blocage par IP
	const attemptByIp = await LoginAttempts.findOne({
		where: { ip_adresse: ip },
	});
	if (attemptByIp?.lockedUntil && new Date() < new Date(attemptByIp.lockedUntil)) {
		return { blocked: true, reason: "ip" }; // IP encore bloquée
	}

	// Vérifier le blocage par email (si fourni)
	if (email) {
		const attemptByEmail = await LoginAttempts.findOne({
			where: { email },
		});
		if (attemptByEmail?.lockedUntil && new Date() < new Date(attemptByEmail.lockedUntil)) {
			return { blocked: true, reason: "email" }; // Email encore bloquée
		}
	}

	return { blocked: false };
};

// Enregistre une tentative échouée pour l'IP ET l'email
const recordFailedAttempt = async (ip, email, id_user) => {
	const lockedUntil = new Date(Date.now() + LOCK_DURATION * 60 * 1000);

	// ===== Gestion du blocage par IP =====
	const attemptByIp = await LoginAttempts.findOne({
		where: { ip_adresse: ip },
	});

	if (!attemptByIp) {
		// Première tentative échouée depuis cette IP
		await LoginAttempts.create({
			ip_adresse: ip,
			email: email || null,
			id_user: id_user || null,
			attemptCount: 1,
			lastAttemptAt: new Date(),
		});
	} else {
		const newCount = attemptByIp.attemptCount + 1;
		await attemptByIp.update({
			attemptCount: newCount,
			lastAttemptAt: new Date(),
			email: email || attemptByIp.email,
			id_user: id_user || attemptByIp.id_user,
			// Bloquer l'IP si le nombre max de tentatives est atteint
			lockedUntil: newCount >= MAX_ATTEMPTS ? lockedUntil : null,
		});
	}

	// ===== Gestion du blocage par email =====
	// Uniquement si un email valide est fourni
	if (email) {
		const attemptByEmail = await LoginAttempts.findOne({
			where: { email },
		});

		if (!attemptByEmail) {
			// Première tentative échouée avec cet email
			await LoginAttempts.create({
				ip_adresse: ip,
				email,
				id_user: id_user || null,
				attemptCount: 1,
				lastAttemptAt: new Date(),
			});
		} else {
			const newCount = attemptByEmail.attemptCount + 1;
			await attemptByEmail.update({
				attemptCount: newCount,
				lastAttemptAt: new Date(),
				// Bloquer le compte si le nombre max de tentatives est atteint
				lockedUntil: newCount >= MAX_ATTEMPTS ? lockedUntil : null,
			});
		}
	}
};

// Réinitialise les tentatives après une connexion réussie
// Nettoie les entrées pour l'IP ET l'email
const resetAttempts = async (ip, email) => {
	// Supprimer les tentatives liées à cette IP
	await LoginAttempts.destroy({ where: { ip_adresse: ip } });

	// Supprimer les tentatives liées à cet email
	if (email) {
		await LoginAttempts.destroy({ where: { email } });
	}
};

// Génère un Access Token (courte durée — 15 minutes)
const generateAccessToken = (user) => {
	return jwt.sign({ id_user: user.id_user, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "15m" });
};

// Génère et sauvegarde un Refresh Token (longue durée — 7 jours)
const generateRefreshToken = async (user) => {
	// Générer un token aléatoire sécurisé (128 caractères hex ( 64 octets × 2 caractères = 128 caractères hex))
	const rawToken = crypto.randomBytes(64).toString("hex");

	// Hasher le token avant stockage en BDD
	// Si la BDD est compromise, les tokens restent inutilisables
	const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

	// Calculer la date d'expiration
	const expireAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 24 * 60 * 60 * 1000);

	// Sauvegarder le hash en BDD (jamais le token brut)
	await RefreshToken.create({
		token_hash: tokenHash,
		id_user: user.id_user,
		expireAt,
	});

	// Retourner le token brut — envoyé au client via cookie httpOnly
	return rawToken;
};

// =============== ROUTES INSCRIPTION ===============

// POST - Inscription
router.post("/inscription", async (req, res) => {
	try {
		const { nom, prenom, email, tel, password } = req.body;

		// Vérifier si l'email existe déjà
		const existingUser = await Utilisateur.findOne({ where: { email } });
		if (existingUser) {
			return res.status(409).json({ message: "Cet email est déjà utilisé" });
		}

		// Hasher le mot de passe avant stockage
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
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// =============== ROUTES LOGIN ===============

// POST - Connexion
router.post("/connexion", async (req, res) => {
	try {
		const { email, password, lastLoginFrom } = req.body;
		const ip = getClientIp(req);

		// 1. Vérifier si l'IP OU l'email est bloqué
		const { blocked, reason } = await isBlocked(ip, email);
		if (blocked) {
			return res.status(429).json({
				message: `Trop de tentatives échouées. Réessayez dans ${LOCK_DURATION} minutes.`,
			});
		}

		// 2. Vérifier si l'utilisateur existe
		const user = await Utilisateur.findOne({ where: { email } });
		if (!user) {
			// On enregistre la tentative avec l'email même si le compte n'existe pas
			await recordFailedAttempt(ip, email, null);
			return res.status(401).json({ message: "Email ou mot de passe incorrect" });
		}

		// 3. Vérifier le mot de passe
		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			// On enregistre la tentative avec l'email ET l'id_user
			await recordFailedAttempt(ip, email, user.id_user);
			return res.status(401).json({ message: "Email ou mot de passe incorrect" });
		}

		// 4. Connexion réussie → réinitialiser les tentatives pour l'IP ET l'email
		await resetAttempts(ip, email);

		// 5. Mettre à jour la dernière connexion
		await user.update({
			lastLoginFrom: lastLoginFrom || "web",
			lastLoginAt: new Date(),
		});

		// 6. Générer les tokens
		const accessToken = generateAccessToken(user);
		const refreshToken = await generateRefreshToken(user);

		// 7. Envoyer le Refresh Token dans un cookie HTTP-only sécurisé
		res.cookie("refreshToken", refreshToken, {
			httpOnly: true, // Inaccessible depuis JavaScript
			secure: true, // HTTPS obligatoire aussi bien en dev qu'en prod grâce à mkcert
			sameSite: "none", // Protection contre les attaques CSRF (Cross-Site Request Forgery).
            //  Cookie envoyé uniquement si la requête vient exactement du même site
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
				tel: user.tel,
				role: user.role,
			},
		});
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// POST - Rafraîchir l'Access Token
router.post("/refresh", async (req, res) => {
	try {
		// 1. Récupérer le Refresh Token depuis le cookie httpOnly
		const rawToken = req.cookies?.refreshToken;
		if (!rawToken) {
			return res.status(401).json({ message: "⚠️ Refresh Token manquant" });
		}

		// 2. Hasher le token reçu pour comparer avec la BDD
		const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

		// 3. Chercher le token en BDD — doit être non révoqué et non expiré
		const storedToken = await RefreshToken.findOne({
			where: {
				token_hash: tokenHash,
				revokedAt: null, // Non révoqué
				expireAt: { [Op.gt]: new Date() }, // Non expiré
			},
			include: [{ model: Utilisateur, as: "utilisateur" }],
		});

		if (!storedToken) {
			return res.status(403).json({ message: "Refresh Token invalide ou expiré" });
		}

		// 4. Générer un nouvel Access Token
		const accessToken = generateAccessToken(storedToken.utilisateur);

		res.status(200).json({ accessToken });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// =============== ROUTES LOGOUT ===============

// POST - Déconnexion
router.post("/deconnexion", async (req, res) => {
	try {
		const rawToken = req.cookies?.refreshToken;

		if (rawToken) {
			// Révoquer le Refresh Token en BDD
			const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
			await RefreshToken.update({ revokedAt: new Date() }, { where: { token_hash: tokenHash } });
		}

		// Supprimer le cookie côté client
		res.clearCookie("refreshToken");
		res.status(200).json({ message: "✅ Déconnexion réussie" });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// =============== ROUTES RESET PASSWORD ===============

// POST - Demande de réinitialisation de mot de passe
// L'utilisateur soumet son email depuis la page "Mot de passe oublié"
router.post("/mot-de-passe-oublie", resetPasswordLimiter, async (req, res) => {
	try {
		const { email } = req.body;

		// On retourne toujours le même message même si l'email n'existe pas
		// Pour ne pas révéler si un compte existe ou non (sécurité)
		const messageGenerique = "Si un compte existe avec cet email, un lien de réinitialisation vous a été envoyé.";

		if (!email) {
			return res.status(400).json({ message: "Email requis" });
		}

		// Chercher l'utilisateur
		const user = await Utilisateur.findOne({ where: { email } });

		// Si l'utilisateur n'existe pas → on retourne quand même le message générique
		// pour ne pas révéler quels emails sont enregistrés
		if (!user) {
			return res.status(200).json({ message: messageGenerique });
		}

		// Invalider tous les anciens tokens non utilisés de cet utilisateur
		await ResetPassword.update({ utilise: 1 }, { where: { id_user: user.id_user, utilise: { [Op.eq]: 0 } } });

		// Générer un token aléatoire sécurisé
		const rawToken = crypto.randomBytes(32).toString("hex");
		const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

		// Expiration dans 30 minutes
		const expireAt = new Date(Date.now() + 30 * 60 * 1000);

		// Sauvegarder le token hashé en BDD
		await ResetPassword.create({
			id_user: user.id_user,
			token_hash: tokenHash,
			expireAt,
			utilise: 0,
		});

		// Construire le lien de réinitialisation envoyé par email
		// Le token brut est dans l'URL — jamais le hash
		const lienReset = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;

		// Envoyer l'email
		await envoyerEmailReset(user.email, user.prenom, lienReset);

		res.status(200).json({ message: messageGenerique });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

// POST - Réinitialisation effective du mot de passe
// L'utilisateur soumet son nouveau mot de passe avec le token reçu par email
router.post("/reset-password", async (req, res) => {
	try {
		const { token, nouveauPassword } = req.body;

		if (!token || !nouveauPassword) {
			return res.status(400).json({ message: "Token et nouveau mot de passe requis" });
		}

		// Hasher le token reçu pour comparer avec la BDD
		const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

		// Chercher le token en BDD — doit être non utilisé et non expiré
		const resetToken = await ResetPassword.findOne({
			where: {
				token_hash: tokenHash,
				utilise: 0,
				expireAt: { [Op.gt]: new Date() },
			},
			include: [{ model: Utilisateur, as: "utilisateur" }],
		});

		if (!resetToken) {
			return res.status(400).json({ message: "Lien invalide ou expiré" });
		}

		// Hasher le nouveau mot de passe
		const hashedPassword = await bcrypt.hash(nouveauPassword, 10);

		// Mettre à jour le mot de passe
		await resetToken.utilisateur.update({ password: hashedPassword });

		// Marquer le token comme utilisé — il ne peut plus servir
		await resetToken.update({ utilise: 1 });

		// Révoquer tous les Refresh Tokens de l'utilisateur
		// Car le mot de passe a changé, toutes les sessions doivent être invalidées
		await RefreshToken.update({ revokedAt: new Date() }, { where: { id_user: resetToken.utilisateur.id_user } });

		res.status(200).json({ message: "Mot de passe réinitialisé avec succès" });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

module.exports = router;
