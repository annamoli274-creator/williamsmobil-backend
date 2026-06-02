import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";
import Cart from "./Cart";

interface CartItemAttributes {
  id: string;
  cartId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartItemCreationAttributes {
  id?: string;
  cartId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

class CartItem extends Model<CartItemAttributes, CartItemCreationAttributes> implements CartItemAttributes {
  declare id: string;
  declare cartId: string;
  declare productId: string;
  declare name: string;
  declare price: number;
  declare quantity: number;
}

CartItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    cartId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    productId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  { sequelize, tableName: "cart_items" }
);

Cart.hasMany(CartItem, { foreignKey: "cartId", as: "items" });
CartItem.belongsTo(Cart, { foreignKey: "cartId" });

export default CartItem;
