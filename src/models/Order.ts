import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";
import Cart from "./Cart";

interface OrderAttributes {
  id: string;
  cartId: string;
  status: string;
  total: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  customerPostalCode: string;
}

interface OrderCreationAttributes {
  id?: string;
  cartId: string;
  status: string;
  total: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  customerPostalCode: string;
}



class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
  declare id: string;
  declare cartId: string;
  declare status: string;
  declare total: number;
  declare customerName: string;
  declare customerEmail: string;
  declare customerPhone: string;
  declare customerAddress: string;
  declare customerCity: string;
  declare customerPostalCode: string;
}

Order.init(
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
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
    },
    total: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    customerEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    customerPhone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    customerAddress: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "",
    },
    customerCity: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    customerPostalCode: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
  },
  { sequelize, tableName: "orders" }
);

Cart.hasMany(Order, { foreignKey: "cartId" });
Order.belongsTo(Cart, { foreignKey: "cartId" });

export default Order;
