const mongoose = require("mongoose");

const UserDataSchema = new mongoose.Schema({
	userEmail: {
		type: String,
		required: true,
		unique: true,
	},
	panier: [
		{
			_id: String,
			name: String,
			prix: Number,
			image: String,
			quantite: Number,
		},
	],
	favoris: [
		{
			_id: String,
			name: String,
			prix: Number,
			image: String,
		},
	],
	lastUpdated: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model("UserData", UserDataSchema, "UserData");
