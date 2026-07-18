// Service centralisé pour l'envoi d'emails via Gmail SMTP
const nodemailer = require("nodemailer");

// Configuration du transporteur SMTP Gmail
// On précise host/port explicitement (au lieu du raccourci "service: gmail")
// et on force family: 4 (IPv4) — certains hébergeurs (dont Railway) ont une
// connectivité IPv6 sortante limitée, ce qui provoque une erreur ENETUNREACH
// si Node.js tente de résoudre smtp.gmail.com en IPv6 en priorité.
const transporter = nodemailer.createTransport({
	host: "smtp.gmail.com",
	port: 465,
	secure: true, // true pour le port 465 (SSL/TLS direct)
	family: 4, // Force la résolution DNS en IPv4
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASSWORD,
	},
});

// Vérification de la connexion au démarrage
transporter.verify((error) => {
	if (error) {
		console.error("❌ Erreur connexion email:", error.message);
	} else {
		console.log("✅ Service email connecté");
	}
});

// Envoi d'un email de réinitialisation de mot de passe
const envoyerEmailReset = async (destinataire, prenom, lienReset) => {
	const mailOptions = {
		from: process.env.EMAIL_FROM,
		to: destinataire,
		subject: "Réinitialisation de votre mot de passe",
		html: `
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
        `,
	};

	await transporter.sendMail(mailOptions);
};

// Envoi d'un email de contact
const envoyerEmailContact = async (nom, email, messageContact) => {
	const mailOptions = {
		from: process.env.EMAIL_FROM,
		// L'email arrive dans la boîte Gmail
		to: process.env.EMAIL_USER,
		// Reply-to permet de répondre directement à l'expéditeur
		replyTo: `${nom} <${email}>`,
		subject: `[Contact] Message de ${nom}`,
		html: `
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
        `,
	};

	await transporter.sendMail(mailOptions);
};

// Envoi d'un email de commande et de la facture
const envoyerEmailConfirmationCommande = async (destinataire, prenom, commande, pdfBuffer) => {
	const mailOptions = {
		from: process.env.EMAIL_FROM,
		to: destinataire,
		subject: `Confirmation de votre commande ${commande.reference}`,
		html: `
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
        `,
		attachments: [
			{
				filename: `facture-${commande.reference}.pdf`,
				content: pdfBuffer,
				contentType: "application/pdf",
			},
		],
	};

	await transporter.sendMail(mailOptions);
};

module.exports = { envoyerEmailReset, envoyerEmailContact, envoyerEmailConfirmationCommande };
