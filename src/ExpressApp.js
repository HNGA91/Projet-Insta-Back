const express = require('express');
const cors = require('cors');
const cookieParser = require("cookie-parser");
const UserRoutes = require("./Routes/Users");
const AdresseRoutes = require("./Routes/Adresses");
const CommandeRoutes = require("./Routes/Commandes");
const ArticleRoutes = require('./Routes/Articles');
const ProduitRoutes = require("./Routes/Produits");
const UserDataRoutes = require("./Routes/UserData");
const AuthRoutes = require("./Routes/AuthRoutes");

const app = express();

// Middlewares
app.use(cors({ origin: "https://localhost:5173", credentials: true })); // Uniquement https://localhost:5173 et Cookies transmis avec les requêtes
app.use(express.json());
app.use(cookieParser());

// Dit à Express : "Toutes ces routes doivent être accessibles"
app.use("/api/adresses", AdresseRoutes);
app.use("/api/articles", ArticleRoutes);
app.use("/api/produits", ProduitRoutes);
app.use("/api/commandes", CommandeRoutes);
app.use("/api/userdata", UserDataRoutes);
app.use("/api/users", UserRoutes);
app.use("/api/auth", AuthRoutes);

module.exports = app;