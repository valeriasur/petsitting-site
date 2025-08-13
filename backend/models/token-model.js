const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Token = sequelize.define(
  "Token",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "tokens",
    timestamps: true,
    // underscored: true,
  }
);

Token.associate = (models) => {
  // Токен принадлежит одному пользователю
  Token.belongsTo(models.User, {
    foreignKey: "user_id",
    as: "TokenOwner",
  });
};

module.exports = Token;
