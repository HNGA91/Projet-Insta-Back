require("dotenv").config();
const mongoose = require("mongoose");

mongoose
	.connect(process.env.MONGODB_URI)
	.then(async () => {
		const result = await mongoose.connection.collection("UserData").deleteMany({});
		console.log(`✅ ${result.deletedCount} document(s) supprimé(s)`);
		process.exit(0);
	})
	.catch((err) => {
		console.error("❌ Erreur:", err.message);
		process.exit(1);
	});
