//src/Server.js
const app = require('./ExpressApp');
const connectDB = require('./DB');

connectDB();

app.listen(3000, () => {
    console.log("📊 Serveur demarré sur le port 3000");
});