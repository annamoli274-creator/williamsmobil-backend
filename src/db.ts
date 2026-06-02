import { Sequelize } from "sequelize";

const DATABASE_URL =
    process.env.DATABASE_URL ??
    "mysql://root:@localhost:3306/client"; // adapter si besoin

// Singleton pattern in development to prevent connection leaks
let sequelize: Sequelize;

const g = global as any;

if (process.env.NODE_ENV === "production") {
  sequelize = new Sequelize(DATABASE_URL, {
    dialect: "mysql",
    logging: false,
  });
} else {
  if (!g.sequelizeInstance) {
    g.sequelizeInstance = new Sequelize(DATABASE_URL, {
      dialect: "mysql",
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });
  }
  sequelize = g.sequelizeInstance;
}

export { sequelize };
