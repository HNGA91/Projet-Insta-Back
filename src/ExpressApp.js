const express = require('express');
const cors = require('cors');
const ArticleRoutes = require('./Routes/Articles');
const UserDataRoutes = require("./Routes/UserData");
const AuthRoutes = require("./Routes/AuthRoutes");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Dit à Express : "Toutes les routes définies dans ArticleRoutes et UserDataRoutes doivent être accessibles"
app.use('/api/Articles', ArticleRoutes);
app.use("/api/userdata", UserDataRoutes);
app.use("/api/auth", AuthRoutes);

module.exports = app;