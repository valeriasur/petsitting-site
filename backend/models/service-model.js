const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Service = sequelize.define(
  "Service",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "services",
    timestamps: false,
    // underscored: true,
  }
);

Service.associate = (models) => {
  // Услугу могут предоставлять многие ситтеры через SitterService
  Service.hasMany(models.SitterService, {
    foreignKey: "service_id",
    as: "ProvidedBySitters",
  });
  // Услуга может присутствовать в нескольких бронированиях
  Service.hasMany(models.Booking, {
    foreignKey: "service_id",
    as: "Bookings",
  });
};

module.exports = Service;
