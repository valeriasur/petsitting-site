const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
    },
    address_details: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    middle_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    confidant_first_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    confidant_last_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    confidant_middle_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    confidant_phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_sitter: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_email_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    email_verification_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email_verification_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    avatarURL: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: true,
  }
);

User.associate = (models) => {
  // Пользователь может иметь много питомцев
  User.hasMany(models.Pet, {
    foreignKey: "owner_user_id",
    as: "Pets",
  });
  // Пользователь может иметь профиль ситтера
  User.hasOne(models.SitterProfile, {
    foreignKey: "user_id",
    as: "SitterProfile",
  });
  // Пользователь как владелец создаёт бронирования
  User.hasMany(models.Booking, {
    foreignKey: "owner_user_id",
    as: "OwnedBookings",
  });
  // Пользователь как ситтер участвует в бронированиях
  User.hasMany(models.Booking, {
    foreignKey: "sitter_user_id",
    as: "SitterBookings",
  });
  // Пользователь может иметь много токенов
  User.hasMany(models.Token, {
    foreignKey: "user_id",
    as: "Tokens",
  });
  // Пользователь может оставлять отзывы
  User.hasMany(models.Review, {
    foreignKey: "user_id",
    as: "CreatedReviews",
  });
};

module.exports = User;
