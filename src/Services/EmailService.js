// Service centralisé pour l'envoi d'emails via l'API Brevo (HTTP)
// On utilise l'API HTTP plutôt que le SMTP classique car certains hébergeurs
// (dont Railway) bloquent ou limitent fortement les connexions SMTP sortantes,
// alors que les appels HTTPS classiques ne posent aucun problème.
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

// Fonction utilitaire : envoie un email via l'API Brevo
// attachments (optionnel) : tableau de { name, content } où content est un Buffer
const envoyerEmailBrevo = async ({ to, subject, html, replyTo, attachments }) => {
	const body = {
		sender: {
			name: "Tech City",
			email: process.env.EMAIL_USER,
		},
		to: [{ email: to }],
		subject,
		htmlContent: html,
	};

	if (replyTo) {
		body.replyTo = { email: replyTo };
	}

	if (attachments && attachments.length > 0) {
		body.attachment = attachments.map((a) => ({
			name: a.name,
			// Brevo attend le contenu en base64
			content: a.content.toString("base64"),
		}));
	}

	const response = await fetch(BREVO_API_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			"api-key": process.env.BREVO_API_KEY,
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(`Erreur Brevo (${response.status}): ${errorData.message || "Erreur inconnue"}`);
	}

	return response.json();
};

// Vérification de la configuration au démarrage
if (!process.env.BREVO_API_KEY) {
	console.error("❌ BREVO_API_KEY manquante — le service email ne fonctionnera pas");
} else {
	console.log("✅ Service email (Brevo) configuré");
}

// Envoi d'un email de réinitialisation de mot de passe
const envoyerEmailReset = async (destinataire, prenom, lienReset) => {
	const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    
            <div style="background-color: #09107e; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0;">Tech City</h1>
            </div>

            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                <h2 style="color: #2c3e50;">Bonjour ${prenom},</h2>

                <p style="color: #555; line-height: 1.6;">
                    Vous avez demandé la réinitialisation de votre mot de passe.
                    Cliquez sur le bouton ci-dessous pour en créer un nouveau.
                </p>

                <div style="text-align: center; margin: 30px 0;">
                    <a 
                        href="${lienReset}" 
                        style="
                            background-color: #1c5be4;
                            color: white;
                            padding: 14px 30px;
                            border-radius: 6px;
                            text-decoration: none;
                            font-weight: bold;
                            font-size: 16px;
                        "
                    >
                        Réinitialiser mon mot de passe
                    </a>
                </div>

                <p style="color: #888; font-size: 0.85rem;">
                    Ce lien est valable pendant <strong>30 minutes</strong>.<br/>
                    Si vous n'avez pas demandé de réinitialisation, ignorez cet email.
                </p>

                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />

                <p style="color: #aaa; font-size: 0.8rem; text-align: center;">
                    © 2026 Tech City. Tous droits réservés.
                </p>
            </div>

        </div>
    `;

	await envoyerEmailBrevo({
		to: destinataire,
		subject: "Réinitialisation de votre mot de passe",
		html,
	});
};

// Envoi d'un email de contact
const envoyerEmailContact = async (nom, email, messageContact) => {
	const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">

            <div style="background-color: #09107e; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0;">Nouveau message de contact</h1>
            </div>

            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px; font-weight: bold; color: #555; width: 120px;">Nom</td>
                        <td style="padding: 10px; color: #2c3e50;">${nom}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px; font-weight: bold; color: #555;">Email</td>
                        <td style="padding: 10px; color: #2c3e50;">
                            <a href="mailto:${email}" style="color: #09107e;">${email}</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; font-weight: bold; color: #555; vertical-align: top;">Message</td>
                        <td style="padding: 10px; color: #2c3e50; white-space: pre-wrap;">${messageContact}</td>
                    </tr>
                </table>

                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />

                <p style="color: #aaa; font-size: 0.8rem; text-align: center;">
                    © 2026 Tech City. Message reçu via le formulaire de contact.
                </p>
            </div>
        </div>
    `;

	await envoyerEmailBrevo({
		// L'email arrive dans la boîte Gmail (adresse configurée comme expéditeur)
		to: process.env.EMAIL_USER,
		subject: `[Contact] Message de ${nom}`,
		html,
		// Reply-to permet de répondre directement à l'expéditeur
		replyTo: email,
	});
};

// Envoi d'un email de commande et de la facture
const envoyerEmailConfirmationCommande = async (destinataire, prenom, commande, pdfBuffer) => {
	const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">

            <div style="background-color: #09107e; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0;">Tech City</h1>
            </div>

            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                <h2 style="color: #2c3e50;">Bonjour ${prenom},</h2>

                <p style="color: #555; line-height: 1.6;">
                    Merci pour votre commande ! Nous avons bien reçu votre paiement et votre commande est en cours de traitement.
                </p>

                <div style="background-color: #fff; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #09107e;">
                    <p style="margin: 0; color: #555;">
                        <strong>Référence :</strong> ${commande.reference}<br/>
                        <strong>Date :</strong> ${new Date(commande.dateCommande).toLocaleDateString("fr-FR")}<br/>
                        <strong>Montant TTC :</strong> ${parseFloat(commande.montant).toFixed(2)} €
                    </p>
                </div>

                <p style="color: #555; line-height: 1.6;">
                    Votre facture est disponible en pièce jointe de cet email.
                    Vous pouvez également la télécharger depuis votre espace client.
                </p>

                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />

                <p style="color: #aaa; font-size: 0.8rem; text-align: center;">
                    © 2026 Tech City. Tous droits réservés.
                </p>
            </div>

        </div>
    `;

	await envoyerEmailBrevo({
		to: destinataire,
		subject: `Confirmation de votre commande ${commande.reference}`,
		html,
		attachments: [
			{
				name: `facture-${commande.reference}.pdf`,
				content: pdfBuffer,
			},
		],
	});
};

module.exports = { envoyerEmailReset, envoyerEmailContact, envoyerEmailConfirmationCommande };
