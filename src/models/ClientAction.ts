import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

interface ClientActionAttributes {
  id?: number;
  cartToken: string;
  actionType: string;
  details?: object | null;
  ipAddress?: string | null;
  createdAt?: Date;
}

class ClientAction extends Model<ClientActionAttributes> implements ClientActionAttributes {
  declare id: number;
  declare cartToken: string;
  declare actionType: string;
  declare details?: object | null;
  declare ipAddress?: string | null;
  declare createdAt?: Date;
}

ClientAction.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    cartToken: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    actionType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "client_actions",
    timestamps: false,
    underscored: true,
  }
);

export default ClientAction;
