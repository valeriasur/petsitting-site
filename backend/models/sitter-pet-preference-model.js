const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const SitterPetPreference = sequelize.define(
  "SitterPetPreference",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
  },
  {
    tableName: "sitter_pet_preferences",
    timestamps: false,
    // underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["sitter_profile_id", "pet_type_id"],
      },
    ],
  }
);

SitterPetPreference.associate = (models) => {
  // Связь с профилем ситтера
  SitterPetPreference.belongsTo(models.SitterProfile, {
    foreignKey: "sitter_profile_id",
    as: "SitterProfile",
  });
  // Связь с типом питомца
  SitterPetPreference.belongsTo(models.PetType, {
    foreignKey: "pet_type_id",
    as: "PetType",
  });
};

module.exports = SitterPetPreference;
