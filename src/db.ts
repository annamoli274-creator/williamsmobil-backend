import { Sequelize } from "sequelize";

const DATABASE_URL = process.env.DATABASE_URL?.trim();

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL manquant !");
  process.exit(1); // stop direct en prod
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: "mysql",
  logging: false,

  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },

  retry: {
    max: 3,
  },
});

// Test de connexion
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connexion MySQL réussie !");
  } catch (error) {
    console.error("❌ Erreur connexion DB :", error);
    process.exit(1); // stop si DB KO
  }
})();

export { sequelize };
