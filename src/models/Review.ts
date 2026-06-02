import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

interface ReviewAttributes {
  id?: number;
  product_id: number;
  user_name: string;
  rating: number;
  comment?: string;
  created_at?: Date;
}

class Review extends Model<ReviewAttributes> implements ReviewAttributes {
  declare id: number;
  declare product_id: number;
  declare user_name: string;
  declare rating: number;
  declare comment?: string;
  declare created_at?: Date;
}

Review.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "reviews",
    timestamps: false,
    underscored: true,
  },
);

export default Review;
