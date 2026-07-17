// Génère une facture PDF en mémoire et la retourne comme Buffer
const PDFDocument = require("pdfkit");

const genererFacturePDF = (commande) => {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ margin: 50 });
		const chunks = [];

		doc.on("data", (chunk) => chunks.push(chunk));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);

		const BLEU = "#09107e";
		const GRIS = "#555555";
		const GRIS_CLAIR = "#f5f5f5";
		const NOIR = "#2c3e50";

		const TVA_TAUX = 0.2; // 20%
		const montantTTC = parseFloat(commande.montant);
		const montantHT = parseFloat((montantTTC / (1 + TVA_TAUX)).toFixed(2));
		const montantTVA = parseFloat((montantTTC - montantHT).toFixed(2));

		// ===== EN-TÊTE =====
		doc.fontSize(28).fillColor(BLEU).font("Helvetica-Bold").text("Tech City", 50, 50);
		doc.fontSize(10).fillColor(GRIS).font("Helvetica").text("Take your Tech", 50, 85);

		// Bloc FACTURE à droite
		doc.fontSize(22).fillColor(NOIR).font("Helvetica-Bold").text("FACTURE", 350, 50, { align: "right" });
		doc.fontSize(10)
			.fillColor(GRIS)
			.font("Helvetica")
			.text(`N° ${commande.reference}`, 350, 80, { align: "right" })
			.text(`Date : ${new Date(commande.dateCommande).toLocaleDateString("fr-FR")}`, 350, 95, { align: "right" });

		// Ligne séparatrice
		doc.moveTo(50, 120).lineTo(545, 120).strokeColor(BLEU).lineWidth(2).stroke();

		// ===== INFOS CLIENT =====
		doc.y = 140;
		doc.fontSize(11).fillColor(BLEU).font("Helvetica-Bold").text("CLIENT", 50, doc.y);
		doc.moveDown(0.3);
		doc.fontSize(10).fillColor(NOIR).font("Helvetica").text(`${commande.client.prenom} ${commande.client.nom}`).text(commande.client.email);

		// ===== ADRESSES CÔTE À CÔTE =====
		const yAdresses = doc.y + 20;

		// Livraison
		doc.fontSize(11).fillColor(BLEU).font("Helvetica-Bold").text("ADRESSE DE LIVRAISON", 50, yAdresses);
		doc.fontSize(10)
			.fillColor(NOIR)
			.font("Helvetica")
			.text(commande.adresseLivraison_rue, 50, yAdresses + 18)
			.text(`${commande.adresseLivraison_cp} ${commande.adresseLivraison_ville}`, 50, yAdresses + 32)
			.text(commande.adresseLivraison_pays, 50, yAdresses + 46);

		// Facturation
		doc.fontSize(11).fillColor(BLEU).font("Helvetica-Bold").text("ADRESSE DE FACTURATION", 300, yAdresses);
		doc.fontSize(10)
			.fillColor(NOIR)
			.font("Helvetica")
			.text(commande.adresseFacturation_rue, 300, yAdresses + 18)
			.text(`${commande.adresseFacturation_cp} ${commande.adresseFacturation_ville}`, 300, yAdresses + 32)
			.text(commande.adresseFacturation_pays, 300, yAdresses + 46);

		// ===== TABLEAU DES ARTICLES =====
		const yTableau = yAdresses + 90;

		// En-tête du tableau
		doc.rect(50, yTableau, 495, 24).fill(BLEU);
		doc.fontSize(10)
			.fillColor("white")
			.font("Helvetica-Bold")
			.text("Article", 60, yTableau + 7)
			.text("Qté", 340, yTableau + 7, { width: 50, align: "center" })
			.text("Prix unitaire", 390, yTableau + 7, { width: 80, align: "right" })
			.text("Sous-total", 470, yTableau + 7, { width: 70, align: "right" });

		// Lignes du tableau
		let y = yTableau + 24;
		commande.lignes.forEach((ligne, index) => {
			const bg = index % 2 === 0 ? "white" : GRIS_CLAIR;
			const sousTotal = (ligne.quantite * parseFloat(ligne.prix_unitaire)).toFixed(2);

			doc.rect(50, y, 495, 22).fill(bg);
			doc.fontSize(10)
				.fillColor(NOIR)
				.font("Helvetica")
				.text(ligne.article?.titre || "Article", 60, y + 6, { width: 270 })
				.text(String(ligne.quantite), 340, y + 6, { width: 50, align: "center" })
				.text(`${parseFloat(ligne.prix_unitaire).toFixed(2)} €`, 390, y + 6, { width: 80, align: "right" })
				.text(`${sousTotal} €`, 470, y + 6, { width: 70, align: "right" });

			y += 22;
		});

		// Bordure du tableau
		doc.rect(50, yTableau, 495, y - yTableau)
			.strokeColor("#cccccc")
			.lineWidth(1)
			.stroke();

		// ===== TOTAUX =====
		y += 20;

		// Bloc totaux aligné à droite
		const xLabel = 380;
		const xValue = 470;
		const wValue = 70;

		doc.fontSize(10)
			.fillColor(GRIS)
			.font("Helvetica")
			.text("Total HT :", xLabel, y, { width: 85, align: "right" })
			.text(`${montantHT.toFixed(2)} €`, xValue, y, { width: wValue, align: "right" });

		y += 16;
		doc.text(`TVA (${TVA_TAUX * 100}%) :`, xLabel, y, { width: 85, align: "right" }).text(`${montantTVA.toFixed(2)} €`, xValue, y, {
			width: wValue,
			align: "right",
		});

		y += 4;
		doc.moveTo(380, y + 12)
			.lineTo(545, y + 12)
			.strokeColor(BLEU)
			.lineWidth(1)
			.stroke();
		y += 16;

		doc.fontSize(12)
			.fillColor(BLEU)
			.font("Helvetica-Bold")
			.text("Total TTC :", xLabel, y, { width: 85, align: "right" })
			.text(`${montantTTC.toFixed(2)} €`, xValue, y, { width: wValue, align: "right" });

		// ===== PIED DE PAGE =====
		doc.fontSize(9)
			.fillColor(GRIS)
			.font("Helvetica")
			.text("© 2026 Tech City — Merci pour votre commande !", 50, 720, { align: "center", width: 495 });

		doc.end();
	});
};

module.exports = { genererFacturePDF };
