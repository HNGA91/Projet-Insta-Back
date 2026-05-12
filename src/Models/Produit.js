const pool = require("../DBMySQL");

// Récupérer tous les produits
const getAllProduits = async () => {
	const [rows] = await pool.query("SELECT * FROM Produit");
	return rows;
};

// Récupérer un produit par ID
const getProduitById = async (id) => {
	const [rows] = await pool.query("SELECT * FROM Produit WHERE id_produit = ?", [id]);
	return rows[0] || null;
};

// Créer un produit
const createProduit = async (data) => {
	const { titre, image, image_alt } = data;
	const [result] = await pool.query("INSERT INTO Produit (titre, image, image_alt) VALUES (?, ?, ?)", [titre, image, image_alt]);
	return result.insertId;
};

// Modifier un produit
const updateProduit = async (id, data) => {
	const { titre, image, image_alt } = data;
	const [result] = await pool.query("UPDATE Produit SET titre = ?, image = ?, image_alt = ? WHERE id_produit = ?", [titre, image, image_alt, id]);
	return result.affectedRows;
};

// Supprimer un produit
const deleteProduit = async (id) => {
	const [result] = await pool.query("DELETE FROM Produit WHERE id_produit = ?", [id]);
	return result.affectedRows;
};

module.exports = {
	getAllProduits,
	getProduitById,
	createProduit,
	updateProduit,
	deleteProduit,
};
