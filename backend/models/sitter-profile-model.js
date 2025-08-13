// models/sitter-profile-model.js
const { DataTypes } = require("sequelize");
const sequelize = require("../db");
// Импортируем User, чтобы Sequelize знал о связи и мог проверить тип ключа
const User = require("./user-model");

const SitterProfile = sequelize.define(
  "SitterProfile",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    user_id: {
      type: DataTypes.UUID,
      allowNull: false, // Профиль не может существовать без пользователя
      unique: true, // <-- Гарантия уникальности (один профиль на пользователя)
      references: {
        // Определение внешнего ключа
        model: "users", // Название ТАБЛИЦЫ пользователей (или модель User)
        key: "id", // Поле, на которое ссылаемся в таблице users
      },
    },

    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    experience_years: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    can_administer_meds: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    max_pets_capacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    has_own_dogs: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    has_own_cats: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    has_other_pets: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    other_pets_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    profile_photo_path: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    housing_photo_paths: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [], // Добавим defaultValue для согласованности
    },
    accepted_sizes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    accepted_ages: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    can_give_injections: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    housing_type: {
      type: DataTypes.ENUM("Квартира", "Апартаменты", "Дом"),
      allowNull: false,
    },
    has_children_under_10: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    has_constant_supervision: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
  },
  {
    tableName: "sitter_profiles",
    timestamps: true,
  }
);

// Ассоциация: Убедитесь, что foreignKey здесь указан и совпадает с полем выше
SitterProfile.associate = (models) => {
  SitterProfile.belongsTo(models.User, {
    foreignKey: "user_id", // <-- Убедитесь, что это имя совпадает с полем выше
    as: "UserAccount",
  });
  SitterProfile.hasMany(models.SitterService, {
    foreignKey: "sitter_profile_id",
    as: "OfferedServices",
  });
  SitterProfile.hasMany(models.SitterPetPreference, {
    foreignKey: "sitter_profile_id",
    as: "PetPreferences",
  });
};

module.exports = SitterProfile;
