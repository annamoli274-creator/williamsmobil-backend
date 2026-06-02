import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";
import Order from "./Order";

interface PaymentAttributes {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  status: string;
  providerResponse?: object | null;
  proofFilePath?: string | null;
}

interface PaymentCreationAttributes {
  id?: string;
  orderId: string;
  amount: number;
  method: string;
  status: string;
  providerResponse?: object | null;
  proofFilePath?: string | null;
}

class Payment extends Model<PaymentAttributes, PaymentCreationAttributes> implements PaymentAttributes {
  declare id: string;
  declare orderId: string;
  declare amount: number;
  declare method: string;
  declare status: string;
  declare providerResponse?: object | null;
  declare proofFilePath?: string | null;
}

Payment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    method: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
    },
    providerResponse: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    proofFilePath: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  { sequelize, tableName: "payments" }
);

Order.hasMany(Payment, { foreignKey: "orderId" });
Payment.belongsTo(Order, { foreignKey: "orderId" });

export default Payment;
