const mongoose = require('mongoose');

const ProduitShema = new mongoose.Schema({
    nom: String,
    categorie: String,
    prix: Number,
    stock: Number,
    disponible: Boolean,
    description: String,
    tags: [String],
});

module.exports = mongoose.model('Listproduits', ProduitShema, 'Produits');