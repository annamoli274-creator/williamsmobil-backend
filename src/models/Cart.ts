import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";
interface CartAttributes {
  id: string;
  token: string;
}

interface CartCreationAttributes {
  id?: string;
  token: string;
}

class Cart extends Model<CartAttributes, CartCreationAttributes> implements CartAttributes {
  declare id: string;
  declare token: string;
}

Cart.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    token: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
  },
  { sequelize, tableName: "carts" }
);

export default Cart;
