const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const User = require("./user-model");

const Sitter = sequelize.define(
  "Sitter",
  {
    sitter_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      references: {
        model: User,
        key: "user_id",
      },
    },
    description: {
      type: DataTypes.TEXT,
    },
    price_per_hour: {
      type: DataTypes.DECIMAL(10, 2),
    },
    available: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "sitters",
    timestamps: true,
    // underscored: true,
  }
);

module.exports = Sitter;
