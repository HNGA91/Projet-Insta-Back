const mongoose = require('mongoose');

const ArticleShema = new mongoose.Schema({
	name: String,
	prix: Number,
	image: String,
});

module.exports = mongoose.model('Articles', ArticleShema, 'Articles');