const pool = require("../DBMySQL");

// Récupérer tous les utilisateurs
const getAllUsers = async () => {
	const [rows] = await pool.query(`
    SELECT id_user, nom, prenom, email, tel, role, lastLoginFrom, lastLoginAt, dateInscription
    FROM Utilisateur
  `);
	return rows;
};

// Récupérer un utilisateur par ID
const getUserById = async (id) => {
	const [rows] = await pool.query(
		`
    SELECT id_user, nom, prenom, email, tel, role, lastLoginFrom, lastLoginAt, dateInscription
    FROM Utilisateur WHERE id_user = ?
  `,
		[id],
	);
	return rows[0] || null;
};

// Récupérer un utilisateur par email (utile pour la connexion)
const getUserByEmail = async (email) => {
	const [rows] = await pool.query("SELECT * FROM Utilisateur WHERE email = ?", [email]);
	return rows[0] || null;
};

// Créer un utilisateur
const createUser = async (data) => {
	const { nom, prenom, email, tel, role, password } = data;
	const [result] = await pool.query(
		`
    INSERT INTO Utilisateur (nom, prenom, email, tel, role, password)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
		[nom, prenom, email, tel, role, password],
	);
	return result.insertId;
};

// Modifier un utilisateur
const updateUser = async (id, data) => {
	const { nom, prenom, email, tel, role } = data;
	const [result] = await pool.query(
		`
    UPDATE Utilisateur
    SET nom = ?, prenom = ?, email = ?, tel = ?, role = ?
    WHERE id_user = ?
  `,
		[nom, prenom, email, tel, role, id],
	);
	return result.affectedRows;
};

// Mettre à jour la dernière connexion
const updateLastLogin = async (id, lastLoginFrom) => {
	const [result] = await pool.query(
		`
    UPDATE Utilisateur
    SET lastLoginFrom = ?, lastLoginAt = NOW()
    WHERE id_user = ?
  `,
		[lastLoginFrom, id],
	);
	return result.affectedRows;
};

// Supprimer un utilisateur
const deleteUser = async (id) => {
	const [result] = await pool.query("DELETE FROM Utilisateur WHERE id_user = ?", [id]);
	return result.affectedRows;
};

module.exports = {
	getAllUsers,
	getUserById,
	getUserByEmail,
	createUser,
	updateUser,
	updateLastLogin,
	deleteUser,
};
