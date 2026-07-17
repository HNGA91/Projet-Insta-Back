// Protection contre les abus et les attaques par force brute sur les routes sensibles
const rateLimit = require("express-rate-limit");

// ===== Limiteur pour le formulaire de contact =====
// 5 messages maximum par heure par IP
// Évite le spam d'emails via le formulaire de contact
const contactLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 heure
	max: 5,
	message: {
		message: "Trop de messages envoyés. Veuillez réessayer dans une heure.",
	},
	standardHeaders: true, // Ajoute les headers RateLimit-* dans la réponse
	legacyHeaders: false,
});

// ===== Limiteur pour le reset password =====
// 3 demandes de reset maximum par heure par IP
// Évite l'énumération d'emails et le spam d'emails de reset
const resetPasswordLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 heure
	max: 3,
	message: {
		message: "Trop de demandes de réinitialisation. Veuillez réessayer dans une heure.",
	},
	standardHeaders: true,
	legacyHeaders: false,
});

// ===== Limiteur pour la création de session Stripe =====
// 10 tentatives de paiement maximum par heure par IP
// Évite les abus sur l'API Stripe qui peut avoir des coûts
const paiementLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 heure
	max: 10,
	message: {
		message: "Trop de tentatives de paiement. Veuillez réessayer dans une heure.",
	},
	standardHeaders: true,
	legacyHeaders: false,
});

module.exports = { contactLimiter, resetPasswordLimiter, paiementLimiter };
