// models/index.js
"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const process = require("process"); // Не используется, но оставим на всякий случай
const basename = path.basename(__filename); // Имя текущего файла (index.js)

// --- ИСПОЛЬЗУЕМ ВАШЕ ПОДКЛЮЧЕНИЕ ---
// Импортируем ваш настроенный экземпляр Sequelize из db.js
// Путь '../db' корректен, если db.js лежит на один уровень выше папки models
const sequelize = require("../db");
// -----------------------------------

const db = {}; // Объект для хранения моделей

// --- Динамический импорт всех файлов моделей из текущей папки ---
fs.readdirSync(__dirname) // Читаем все файлы в папке 'models'
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 && // Файл не должен начинаться с точки (типа .gitkeep)
      file !== basename && // Исключаем сам index.js
      file.slice(-3) === ".js" && // Файл должен заканчиваться на .js
      file.indexOf(".test.js") === -1 && // Исключаем тестовые файлы
      !file.startsWith("sitter-model.") // Исключаем старую модель Sitter (если файл называется sitter-model.js)
      // Используйте file === 'sitter-model.js' если имя точное
    );
  })
  .forEach((file) => {
    try {
      // Импортируем модель. Предполагается, что модель экспортирует инициализированный объект Sequelize
      const model = require(path.join(__dirname, file));
      // Проверяем, что это действительно модель Sequelize
      if (model && model.prototype instanceof Sequelize.Model) {
        console.log(`  - Загрузка модели: ${model.name}`);
        db[model.name] = model; // Добавляем модель в объект db по ее имени
      } else {
        console.warn(
          `  - Файл ${file} не является валидной моделью Sequelize и был пропущен.`
        );
      }
    } catch (importError) {
      console.error(
        `  - Ошибка при импорте модели из файла ${file}:`,
        importError
      );
    }
  });
// -------------------------------------------------------------

// --- Настройка ассоциаций между моделями ---
console.log("Определение ассоциаций...");
Object.keys(db).forEach((modelName) => {
  // Проверяем, есть ли у модели статическая функция 'associate'
  if (
    db[modelName].associate &&
    typeof db[modelName].associate === "function"
  ) {
    console.log(`  - Вызов associate для ${modelName}`);
    db[modelName].associate(db); // Вызываем associate, передавая все загруженные модели
  }
});
console.log("Ассоциации определены.");
// --------------------------------------

// --- Экспорт объекта db ---
db.sequelize = sequelize; // Экспортируем сам экземпляр sequelize
db.Sequelize = Sequelize; // Экспортируем конструктор Sequelize (может пригодиться)

module.exports = db; // Экспортируем объект db, содержащий все модели и sequelize
