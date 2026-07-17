// Ce fichier s'exécute avant et après chaque fichier de test
// On ne ferme PAS les connexions ici car chaque fichier de test
// doit pouvoir nettoyer ses données AVANT la fermeture

const sequelize = require("../SequelizeDB");
const mongoose = require("mongoose");