# 🛒 Tech City — Backend

API REST du projet e-commerce **Tech City**, développée avec Node.js / Express, MySQL (Sequelize) et MongoDB (Mongoose).

---

## 👤 Auteur

**Hervé N'Goma**

---

## 📋 Table des matières

- [Aperçu du projet](#aperçu-du-projet)
- [Technologies utilisées](#technologies-utilisées)
- [Architecture du projet](#architecture-du-projet)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Variables d'environnement](#variables-denvironnement)
- [Lancer le projet](#lancer-le-projet)
- [Tests](#tests)
- [Sécurité](#sécurité)
- [Licence](#licence)

---

## 📖 Aperçu du projet

Tech City Backend est l'API REST qui alimente la plateforme e-commerce Tech City, spécialisée dans la vente de composants et périphériques informatiques. Elle gère :

- L'authentification et la gestion des utilisateurs (JWT + refresh token)
- Le catalogue de produits et d'articles
- Le panier et les favoris (persistance MongoDB)
- Les commandes et la génération de factures PDF
- Le paiement en ligne sécurisé via Stripe
- L'envoi d'emails transactionnels (confirmation, réinitialisation de mot de passe)

---

## 🛠️ Technologies utilisées

| Technologie | Rôle |
|---|---|
| Node.js | Environnement d'exécution |
| Express | Framework HTTP |
| MySQL + Sequelize | Base de données relationnelle (utilisateurs, produits, articles, commandes, adresses) |
| MongoDB + Mongoose | Base de données NoSQL (panier, favoris) |
| JWT | Authentification par token (access token + refresh token) |
| bcrypt | Hachage des mots de passe |
| Helmet | Sécurisation des headers HTTP |
| express-rate-limit | Limitation du taux de requêtes |
| Stripe | Traitement des paiements en ligne |
| Multer | Upload d'images |
| PDFKit | Génération de factures PDF |
| Nodemailer | Envoi d'emails transactionnels |
| Jest + Supertest | Tests unitaires et d'intégration |

---

## 🗂️ Architecture du projet

```
MyProjectBackend/
│
├── public/
│   └── Images/                    # Images statiques (articles, produits)
│
├── src/
│   ├── Middleware/
│   │   ├── Authentification.js    # Vérification du JWT
│   │   ├── IsAdmin.js             # Contrôle d'accès administrateur
│   │   └── RateLimiter.js         # Limitation du taux de requêtes
│   │
│   ├── Models/
│   │   ├── MongoDB/
│   │   │   └── UserData.js        # Panier et favoris
│   │   └── MySQL/
│   │       ├── User.js
│   │       ├── Article.js
│   │       ├── Produit.js
│   │       ├── Adresse.js
│   │       ├── Commander.js
│   │       ├── LoginAttempts.js
│   │       ├── RefreshToken.js
│   │       └── ResetPassword.js
│   │
│   ├── Routes/
│   │   ├── AuthRoutes.js          # Inscription, connexion, reset password
│   │   ├── Users.js
│   │   ├── Articles.js
│   │   ├── Produits.js
│   │   ├── Adresses.js
│   │   ├── Commandes.js
│   │   ├── UserData.js
│   │   ├── Paiement.js            # Stripe Checkout + webhook
│   │   └── Contact.js
│   │
│   ├── Services/
│   │   ├── EmailService.js        # Emails transactionnels
│   │   └── PdfService.js          # Génération de factures
│   │
│   ├── Tests/
│   │   ├── auth.test.js
│   │   └── setup.js
│   │
│   ├── ExpressApp.js              # Configuration Express (middlewares, routes)
│   ├── MongoDB.js                 # Connexion MongoDB
│   ├── SequelizeDB.js             # Connexion MySQL
│   └── Server.js                  # Point d'entrée serveur (HTTPS local)
│
└── .env                           # Variables d'environnement (non versionné)
```

---

## ✅ Prérequis

Avant de commencer, assure-toi d'avoir installé :

- [Node.js](https://nodejs.org/) v18 ou supérieur
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [MySQL](https://www.mysql.com/) (local ou cloud)
- [MongoDB](https://www.mongodb.com/) (local ou Atlas)
- [mkcert](https://github.com/FiloSottile/mkcert) pour générer des certificats SSL locaux (développement en HTTPS)
- [Git](https://git-scm.com/)

---

## 🚀 Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/HNGA91/Projet-Insta-Back.git
cd Projet-Insta-Back
```

### 2. Installer les dépendances

```bash
pnpm install
```

### 3. Générer les certificats SSL locaux (mkcert)

```bash
mkcert -install
mkcert localhost
```

Place les fichiers `localhost-key.pem` et `localhost.pem` générés à la racine du projet.

---

## 🔐 Variables d'environnement

> ⚠️ Ne jamais committer le fichier `.env` — il contient des données sensibles.

### Backend — `.env`
```env
# Token
JWT_SECRET=ta_clef_secrete_jwt
JWT_REFRESH_SECRET=ta_clef_secrete_refresh

# MongoDB
MONGODB_URI=mongodb://localhost:27017/projet_pfe_db

# Serveur
PORT=3000
NODE_ENV=development

# MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=ton_mot_de_passe
MYSQL_DB=projet_pfe_db

# Email
EMAIL_USER=ton_email@gmail.com
EMAIL_PASSWORD=ton_mot_de_passe_application
EMAIL_FROM=Tech-City <ton_email@gmail.com>

# Frontend
FRONTEND_URL=https://localhost:5173

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## ▶️ Lancer le projet

### Mode développement (avec rechargement automatique)
```bash
pnpm run dev
```

### Mode production
```bash
pnpm run start
```

L'API sera accessible sur : **https://localhost:3000**

---

## 🧪 Tests

Les tests sont écrits avec **Jest** et **Supertest**.

### Lancer les tests
```bash
pnpm test
```

### Fichiers de tests
```
src/Tests/
├── auth.test.js    # Tests d'authentification (connexion, échecs, brute force)
└── setup.js        # Configuration globale des tests
```

---

## 🔒 Sécurité

Plusieurs mécanismes de sécurité sont mis en œuvre :

- **Hachage des mots de passe** avec bcrypt
- **JWT à courte durée de vie** (15 minutes) + refresh token (7 jours, cookie httpOnly, hashé en base via SHA-256)
- **Protection contre les attaques par force brute** (blocage par IP et par email après plusieurs tentatives échouées)
- **Headers de sécurité HTTP** via Helmet (CSP, X-Frame-Options, HSTS...)
- **CORS restrictif** limité au domaine du frontend
- **Limitation du taux de requêtes** sur les routes sensibles (contact, reset password, paiement)
- **Vérification de signature** des webhooks Stripe
- **Transactions Sequelize** garantissant l'intégrité des données lors de la création de commandes

---

## 📄 Licence

Ce projet est sous licence **MIT**.
Toute réutilisation doit mentionner l'auteur original.

> ⚠️ Toute reproduction ou présentation de ce projet comme étant le vôtre sans attribution constitue une violation de la licence.