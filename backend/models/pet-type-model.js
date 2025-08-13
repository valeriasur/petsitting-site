const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const PetType = sequelize.define(
  "PetType",
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
  },
  {
    tableName: "pet_types",
    timestamps: false,
    // underscored: true,
  }
);

PetType.associate = (models) => {
  // К одному типу может относиться много питомцев
  PetType.hasMany(models.Pet, {
    foreignKey: "pet_type_id",
    as: "PetsOfType",
  });
  // Один тип животного может быть предпочтителен для многих ситтеров
  PetType.hasMany(models.SitterPetPreference, {
    foreignKey: "pet_type_id",
    as: "PreferredBySitters",
  });
};

module.exports = PetType;
