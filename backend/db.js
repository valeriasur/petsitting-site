// db.js - САМАЯ ПРОСТАЯ И НАДЕЖНАЯ ВЕРСИЯ
const { Sequelize } = require("sequelize");
require("dotenv").config();

// 1. Создаем и настраиваем экземпляр Sequelize
const sequelize = new Sequelize(
  process.env.PG_DATABASE,
  process.env.PG_USER,
  process.env.PG_PASSWORD,
  {
    host: process.env.PG_HOST || "localhost",
    dialect: "postgres",
    logging: false,
    define: {
      underscored: true, // Глобально используем snake_case
    },
  }
);

// 2. Экспортируем ТОЛЬКО экземпляр sequelize
// Файл больше НЕ ДОЛЖЕН импортировать модели!
module.exports = sequelize;
