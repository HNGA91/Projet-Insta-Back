const express = require("express");
const router = express.Router();
const Listproduit = require("../Models/Produit.js");

// GET : Récupérer tous les produits
router.get('/', async (req, res) => {
    try {
        const produits = await Listproduit.find();

        // Renvoie les produits au client au format JSON
        res.json(produits); 
    } catch  (err) {
        res.status(500).json({ message : err.message });
    }
});

module.exports = router;