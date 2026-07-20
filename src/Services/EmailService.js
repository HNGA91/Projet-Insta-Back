// Service centralisé pour l'envoi d'emails via Gmail SMTP (Nodemailer)
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
	host: "smtp.gmail.com",
	port: 465,
	secure: true,
	auth: {
		user: process.env.GMAIL_USER,
		pass: process.env.GMAIL_APP_PASSWORD, // mot de passe d'application, pas le mot de passe du compte
	},
	// Force la résolution en IPv4 : certains hébergeurs (dont Railway) ont un réseau
	// sortant IPv6 mal routé, ce qui provoque une erreur ENETUNREACH vers les serveurs Gmail.
	family: 4,
});

const EXPEDITEUR = `Tech City <${process.env.GMAIL_USER}>`;

// Fonction utilitaire : envoie un email via Gmail SMTP
// attachments (optionnel) : tableau de { name, content } où content est un Buffer
const envoyerEmailGmail = async ({ to, subject, html, replyTo, attachments }) => {
	const mailOptions = {
		from: EXPEDITEUR,
		to,
		subject,
		html,
	};

	if (replyTo) {
		mailOptions.replyTo = replyTo;
	}

	if (attachments && attachments.length > 0) {
		mailOptions.attachments = attachments.map((a) => ({
			filename: a.name,
			// Nodemailer accepte directement un Buffer, pas besoin de base64
			content: a.content,
		}));
	}

	try {
		return await transporter.sendMail(mailOptions);
	} catch (error) {
		throw new Error(`Erreur Gmail: ${error.message || "Erreur inconnue"}`);
	}
};

// Vérification de la configuration au démarrage
if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
	console.error("❌ GMAIL_USER ou GMAIL_APP_PASSWORD manquant — le service email ne fonctionnera pas");
} else {
	console.log("✅ Service email (Gmail) configuré");
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

	await envoyerEmailGmail({
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

	await envoyerEmailGmail({
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

	await envoyerEmailGmail({
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
