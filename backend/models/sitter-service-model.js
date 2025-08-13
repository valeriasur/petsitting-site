const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const SitterService = sequelize.define(
  "SitterService",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    price_unit: {
      // Обновленный ENUM
      type: DataTypes.ENUM("day", "per_30_min"), // Убрали 'hour', 'visit', 'walk'. Добавили 'per_30_min'
      allowNull: false,
    },
    // УДАЛЕНЫ: price_extra_half_hour, price_hour, price_extra_hour
  },
  {
    tableName: "sitter_services",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["sitter_profile_id", "service_id"],
      },
    ],
  }
);

SitterService.associate = (models) => {
  // Связь с профилем ситтера
  SitterService.belongsTo(models.SitterProfile, {
    foreignKey: "sitter_profile_id",
    as: "SitterProfile",
  });
  // Связь с услугой
  SitterService.belongsTo(models.Service, {
    foreignKey: "service_id",
    as: "ServiceDetails",
  });
};

module.exports = SitterService;
