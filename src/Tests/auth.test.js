const request = require("supertest");
const app = require("../ExpressApp");
const Utilisateur = require("../Models/MySQL/User");
const LoginAttempts = require("../Models/MySQL/LoginAttempts");
const bcrypt = require("bcrypt");

// Données de test réutilisées dans plusieurs cas
const TEST_USER = {
	nom: "TestJest",
	prenom: "User",
	email: "test@jtest.com",
	tel: "0612345678",
	password: "TestJest1234!",
};

// beforeAll s'exécute UNE FOIS avant tous les tests de ce fichier
// On crée un utilisateur de test directement en BDD pour éviter
// de dépendre d'une route d'inscription qui pourrait elle-même être en erreur
beforeAll(async () => {
	// Nettoyer d'abord au cas où une exécution précédente aurait planté
	await Utilisateur.destroy({ where: { email: TEST_USER.email } });
	await LoginAttempts.destroy({ where: { email: TEST_USER.email } });

	// Ensuite créer l'utilisateur de test
	const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);
	await Utilisateur.create({
		nom: TEST_USER.nom,
		prenom: TEST_USER.prenom,
		email: TEST_USER.email,
		tel: TEST_USER.tel,
		role: "client",
		password: hashedPassword,
	});
});

// afterAll s'exécute UNE FOIS après tous les tests de ce fichier
// On nettoie les données créées pour ne pas polluer la BDD de dev
afterAll(async () => {
	// 1. D'abord nettoyer les données de test
	await Utilisateur.destroy({ where: { email: TEST_USER.email } });
	await LoginAttempts.destroy({ where: { email: TEST_USER.email } });

	// 2. Ensuite fermer les connexions
	const sequelize = require("../SequelizeDB");
	const mongoose = require("mongoose");
	await sequelize.close();
	if (mongoose.connection.readyState !== 0) {
		await mongoose.connection.close();
	}
});

describe("POST /api/auth/connexion", () => {
	// ===== CAS DE SUCCÈS =====
	it("devrait retourner un accessToken avec des identifiants valides", async () => {
		const response = await request(app).post("/api/auth/connexion").send({
			email: TEST_USER.email,
			password: TEST_USER.password,
		});

		// Vérifier le statut HTTP
		expect(response.status).toBe(200);

		// Vérifier que la réponse contient bien un accessToken
		expect(response.body).toHaveProperty("accessToken");

		// Vérifier que les infos utilisateur sont bien retournées
		expect(response.body.user.email).toBe(TEST_USER.email);

		// Vérifier que le mot de passe n'est JAMAIS retourné dans la réponse
		expect(response.body.user).not.toHaveProperty("password");

		// Vérifier que le cookie refreshToken est bien présent
		expect(response.headers["set-cookie"]).toBeDefined();
	});

	// ===== CAS D'ÉCHEC : MAUVAIS MOT DE PASSE =====
	it("devrait retourner 401 avec un mauvais mot de passe", async () => {
		const response = await request(app).post("/api/auth/connexion").send({
			email: TEST_USER.email,
			password: "MauvaisMotDePasse123!",
		});

		expect(response.status).toBe(401);
		expect(response.body.message).toBe("Email ou mot de passe incorrect");
	});

	// ===== CAS D'ÉCHEC : EMAIL INEXISTANT =====
	it("devrait retourner 401 avec un email qui n'existe pas", async () => {
		const response = await request(app).post("/api/auth/connexion").send({
			email: "inexistant@example.com",
			password: "PeuImporte123!",
		});

		expect(response.status).toBe(401);
		expect(response.body.message).toBe("Email ou mot de passe incorrect");
	});

	// ===== CAS BRUTE FORCE =====
	it("devrait bloquer après 3 tentatives échouées", async () => {
		// On envoie volontairement 3 mauvaises tentatives de suite
		for (let i = 0; i < 3; i++) {
			await request(app).post("/api/auth/connexion").send({
				email: TEST_USER.email,
				password: "MauvaisMotDePasse",
			});
		}

		// La 6ème tentative doit être bloquée, même avec le bon mot de passe
		const response = await request(app).post("/api/auth/connexion").send({
			email: TEST_USER.email,
			password: TEST_USER.password, // bon mot de passe cette fois
		});

		// Doit être bloqué malgré le bon mot de passe
		expect(response.status).toBe(429);
		expect(response.body.message).toContain("Trop de tentatives");
	});
});
