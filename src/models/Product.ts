import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

interface ProductAttributes {
  id: string;
  title: string;
  price: string;
  oldPrice?: string | null;
  discount?: string | null;
  image: string;
  gallery?: string[] | null;
  description: string;
  features?: string[] | null;
  category: string;
  options?: string[] | null;
  specs?: Record<string, string | string[]> | null;
}

class Product extends Model<ProductAttributes> implements ProductAttributes {
  declare id: string;
  declare title: string;
  declare price: string;
  declare oldPrice?: string | null;
  declare discount?: string | null;
  declare image: string;
  declare gallery?: string[] | null;
  declare description: string;
  declare features?: string[] | null;
  declare category: string;
  declare options?: string[] | null;
  declare specs?: Record<string, string | string[]> | null;
}

Product.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
    title: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.STRING, allowNull: false },
    oldPrice: { type: DataTypes.STRING, allowNull: true },
    discount: { type: DataTypes.STRING, allowNull: true },
    image: { type: DataTypes.TEXT, allowNull: false },
    gallery: { type: DataTypes.JSON, allowNull: true },
    description: { type: DataTypes.TEXT("long"), allowNull: false },
    features: { type: DataTypes.JSON, allowNull: true },
    category: { type: DataTypes.STRING, allowNull: false },
    options: { type: DataTypes.JSON, allowNull: true },
    specs: { type: DataTypes.JSON, allowNull: true },
  },
  {
    sequelize,
    tableName: "products",
    timestamps: true,
  },
);

export default Product;
