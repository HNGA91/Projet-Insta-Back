const pool = require("../DBMySQL");

// Récupérer tous les articles (avec le titre du produit/catégorie)
const getAllArticles = async () => {
	const [rows] = await pool.query(`
    SELECT a.*, p.titre AS produit_titre
    FROM Article a
    LEFT JOIN Produit p ON a.id_produit = p.id_produit
  `);
	return rows;
};

// Récupérer un article par ID
const getArticleById = async (id) => {
	const [rows] = await pool.query(
		`
    SELECT a.*, p.titre AS produit_titre
    FROM Article a
    LEFT JOIN Produit p ON a.id_produit = p.id_produit
    WHERE a.id_article = ?
  `,
		[id],
	);
	return rows[0] || null;
};

// Récupérer tous les articles d'un produit/catégorie
const getArticlesByProduit = async (id_produit) => {
	const [rows] = await pool.query(
		`
    SELECT * FROM Article WHERE id_produit = ?
  `,
		[id_produit],
	);
	return rows;
};

// Créer un article
const createArticle = async (data) => {
	const { titre, marque, image, image_alt, description, stock, disponibilite, prix, id_produit } = data;
	const [result] = await pool.query(
		`
    INSERT INTO Article (titre, marque, image, image_alt, description, stock, disponibilite, prix, id_produit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
		[titre, marque, image, image_alt, description, stock, disponibilite, prix, id_produit],
	);
	return result.insertId;
};

// Modifier un article
const updateArticle = async (id, data) => {
	const { titre, marque, image, image_alt, description, stock, disponibilite, prix, id_produit } = data;
	const [result] = await pool.query(
		`
    UPDATE Article
    SET titre = ?, marque = ?, image = ?, image_alt = ?, description = ?,
        stock = ?, disponibilite = ?, prix = ?, id_produit = ?
    WHERE id_article = ?
  `,
		[titre, marque, image, image_alt, description, stock, disponibilite, prix, id_produit, id],
	);
	return result.affectedRows;
};

// Mettre à jour uniquement le stock et la disponibilité
const updateStock = async (id, stock) => {
	const disponibilite = stock === 0 ? "rupture" : "disponible";
	const [result] = await pool.query(
		`
    UPDATE Article SET stock = ?, disponibilite = ? WHERE id_article = ?
  `,
		[stock, disponibilite, id],
	);
	return result.affectedRows;
};

// Supprimer un article
const deleteArticle = async (id) => {
	const [result] = await pool.query("DELETE FROM Article WHERE id_article = ?", [id]);
	return result.affectedRows;
};

module.exports = {
	getAllArticles,
	getArticleById,
	getArticlesByProduit,
	createArticle,
	updateArticle,
	updateStock,
	deleteArticle,
};
