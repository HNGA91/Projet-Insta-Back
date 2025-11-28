const express = require('express');
const cors = require('cors');
const ArticleRoutes = require('./Routes/Articles');

const app = express();

app.use(cors());
app.use(express.json());

// Dit à Express : "Toutes les routes définies dans ProduitRoutes doivent être accessibles"
app.use('/api/Articles', ArticleRoutes);

module.exports = app;