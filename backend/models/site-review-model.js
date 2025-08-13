// backend/models/site-review-model.js
const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const SiteReview = sequelize.define(
  "SiteReview",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    author_name: { type: DataTypes.STRING, allowNull: true },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    comment: { type: DataTypes.TEXT, allowNull: false },
    is_anonymous: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_published: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  { tableName: "site_reviews", timestamps: true }
);

// Ассоциации здесь не нужны, если отзывы полностью независимы
// SiteReview.associate = (models) => {};

module.exports = SiteReview;
