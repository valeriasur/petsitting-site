// В файле migrations/YYYYMMDDHHMMSS-add-user-id-and-unique-to-sitter-profiles.js
"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Пытаемся добавить колонку user_id
      await queryInterface.addColumn("sitter_profiles", "user_id", {
        type: Sequelize.UUID, // Убедитесь, что тип верный
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        // onDelete: 'CASCADE', // Опционально
        // onUpdate: 'CASCADE'  // Опционально
      });
      console.log("Колонка user_id успешно добавлена в sitter_profiles.");
    } catch (error) {
      // Ловим ошибку, если колонка уже существует (это нормально)
      if (
        error.name === "SequelizeDatabaseError" &&
        error.original?.code === "42701"
      ) {
        // Код ошибки PostgreSQL для duplicate column
        console.log("Колонка user_id уже существует в sitter_profiles.");
      } else {
        // Если другая ошибка при добавлении колонки, пробрасываем ее
        console.error("Ошибка при добавлении колонки user_id:", error);
        throw error;
      }
    }

    try {
      // Пытаемся добавить уникальное ограничение
      await queryInterface.addConstraint("sitter_profiles", {
        fields: ["user_id"],
        type: "unique",
        name: "sitter_profiles_user_id_unique_constraint", // Уникальное имя для ограничения
      });
      console.log("Уникальное ограничение на user_id успешно добавлено.");
    } catch (error) {
      // Ловим ошибку, если ограничение уже существует
      if (
        error.name === "SequelizeUniqueConstraintError" ||
        error.original?.code === "42P07" ||
        error.original?.code === "42710"
      ) {
        // Коды ошибок PostgreSQL для duplicate constraint/index
        console.log("Уникальное ограничение на user_id уже существует.");
      } else if (error.original?.code === "23505") {
        // Код ошибки PostgreSQL для нарушения уникальности (если есть дубликаты)
        console.error(
          "Ошибка: Невозможно добавить уникальное ограничение, так как в таблице sitter_profiles есть дублирующиеся значения user_id. Удалите дубликаты перед запуском миграции."
        );
        throw new Error(
          "Дубликаты user_id найдены в sitter_profiles. Ограничение не добавлено."
        );
      } else {
        // Если другая ошибка при добавлении ограничения, пробрасываем ее
        console.error("Ошибка при добавлении уникального ограничения:", error);
        throw error;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Порядок удаления обратный: сначала ограничение, потом колонка
    try {
      await queryInterface.removeConstraint(
        "sitter_profiles",
        "sitter_profiles_user_id_unique_constraint"
      );
      console.log("Уникальное ограничение на user_id удалено.");
    } catch (error) {
      console.warn(
        "Не удалось удалить ограничение sitter_profiles_user_id_unique_constraint (возможно, его нет):",
        error.message
      );
    }
    try {
      await queryInterface.removeColumn("sitter_profiles", "user_id");
      console.log("Колонка user_id удалена.");
    } catch (error) {
      console.warn(
        "Не удалось удалить колонку user_id (возможно, ее нет):",
        error.message
      );
    }
  },
};
