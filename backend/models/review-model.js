const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Review = sequelize.define(
  "Review",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "reviews",
    timestamps: true,
    // underscored: true,
  }
);

Review.associate = (models) => {
  // Отзыв относится к одному бронированию
  Review.belongsTo(models.Booking, {
    foreignKey: "booking_id",
    as: "Booking",
  });
  // Отзыв оставляет один пользователь
  Review.belongsTo(models.User, {
    foreignKey: "user_id",
    as: "Reviewer",
  });
};

module.exports = Review;
