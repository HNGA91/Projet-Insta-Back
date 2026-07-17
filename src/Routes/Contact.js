const express = require("express");
const router = express.Router();
const { envoyerEmailContact } = require("../Services/EmailService");
const { contactLimiter } = require("../Middleware/RateLimiter");

// POST - Envoyer un message de contact
router.post("/", contactLimiter, async (req, res) => {
	try {
		const { nom, email, message } = req.body;

		// Validation basique
		if (!nom || !email || !message) {
			return res.status(400).json({ message: "Tous les champs sont obligatoires." });
		}

		if (message.trim().length < 10) {
			return res.status(400).json({ message: "Le message doit contenir au moins 10 caractères." });
		}

		await envoyerEmailContact(nom, email, message);

		res.status(200).json({ message: "Votre message a bien été envoyé." });
	} catch (error) {
		res.status(500).json({ message: "Erreur serveur", error: error.message });
	}
});

module.exports = router;
