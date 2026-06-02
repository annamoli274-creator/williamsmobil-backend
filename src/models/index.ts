import { sequelize } from "../db";
import Cart from "./Cart";
import CartItem from "./CartItem";
import Order from "./Order";
import Payment from "./Payment";
import Product from "./Product";
import Review from "./Review";
import ClientAction from "./ClientAction";

export {
  sequelize,
  Cart,
  CartItem,
  Order,
  Payment,
  Product,
  Review,
  ClientAction,
};

/** Synchroniser les modÃ¨les â€“ uniquement en dÃ©veloppement */
export async function syncModels(): Promise<void> {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false });
    console.log("âœ… ModÃ¨les synchronisÃ©s");
  } catch (err) {
    console.error("âŒ Erreur de sync Sequelize :", err);
    throw err;
  }
}
