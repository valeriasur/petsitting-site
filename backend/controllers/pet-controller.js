// backend/controllers/pet-controller.js
const { validationResult } = require("express-validator");
const sequelize = require("../db");
const ApiError = require("../exceptions/api-error");
const petService = require("../service/pet-service"); // Импортируем сервис, если он есть и используется

class PetController {
  async createPet(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Используем ApiError для единообразия
        return next(
          ApiError.BadRequest(
            "Ошибка валидации при создании питомца",
            errors.array()
          )
        );
      }

      const Pet = sequelize.models.Pet;
      const {
        name,
        breed,
        size,
        age,
        gender,
        is_sterilized,
        animal_neighborhood,
        alone_home,
        is_vaccinated,
        description,
        pet_type_id,
      } = req.body;

      // Проверка обязательных полей (особенно age)
      if (
        age === undefined ||
        age === null ||
        age === "" ||
        isNaN(parseInt(age, 10)) ||
        parseInt(age, 10) < 0
      ) {
        return next(
          ApiError.BadRequest(
            "Поле 'Возраст' обязательно и должно быть корректным числом."
          )
        );
      }
      // Другие обязательные поля тоже можно проверить здесь

      const petData = {
        name,
        breed,
        size,
        age: parseInt(age, 10), // Убедимся, что это число
        gender,
        is_sterilized,
        animal_neighborhood,
        alone_home,
        is_vaccinated,
        description,
        pet_type_id,
        owner_user_id: req.user.id,
      };

      if (req.file) {
        petData.photo_path = `/pet_photos/${req.file.filename}`;
      }

      const newPet = await Pet.create(petData);
      const petWithDetails = await Pet.findByPk(newPet.id, {
        include: [
          {
            model: sequelize.models.PetType,
            as: "PetType",
            attributes: ["id", "name"],
          },
        ],
      });
      return res
        .status(201)
        .json({ message: "Питомец успешно создан", pet: petWithDetails });
    } catch (e) {
      console.error("Ошибка при создании питомца:", e);
      // Если это ошибка валидации Sequelize (например, unique constraint), она может быть в e.errors
      if (
        e.name === "SequelizeValidationError" ||
        e.name === "SequelizeUniqueConstraintError"
      ) {
        return next(
          ApiError.BadRequest("Ошибка валидации данных питомца.", e.errors)
        );
      }
      next(ApiError.InternalServerError("Ошибка сервера при создании питомца"));
    }
  }

  async getAll(req, res, next) {
    // Добавил next
    try {
      const PetType = sequelize.models.PetType;
      if (!PetType) {
        return next(ApiError.InternalServerError("Модель PetType не найдена."));
      }
      const types = await PetType.findAll({
        attributes: ["id", "name"],
        order: [["name", "ASC"]],
      });
      res.json(types);
    } catch (e) {
      console.error("Ошибка при получении типов животных:", e);
      next(
        ApiError.InternalServerError(
          "Ошибка сервера при получении типов животных"
        )
      );
    }
  }

  async getMyPets(req, res, next) {
    try {
      const Pet = sequelize.models.Pet;
      if (!Pet) {
        return next(ApiError.InternalServerError("Модель Pet не найдена."));
      }
      const ownerUserId = req.user?.id;
      if (!ownerUserId) {
        return next(ApiError.UnauthorizedError());
      }

      const pets = await Pet.findAll({
        where: { owner_user_id: ownerUserId },
        include: [
          {
            model: sequelize.models.PetType,
            as: "PetType",
            attributes: ["id", "name"],
          },
        ], // Включаем PetType
        order: [["name", "ASC"]],
        // Убираем attributes для Pet, чтобы загрузить все поля, включая photo_path
      });

      return res.json(pets);
    } catch (error) {
      console.error("Ошибка при получении питомцев пользователя:", error);
      next(
        ApiError.InternalServerError("Не удалось получить список питомцев.")
      );
    }
  }

  async updatePet(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(
          ApiError.BadRequest(
            "Ошибка валидации при обновлении питомца",
            errors.array()
          )
        );
      }

      const Pet = sequelize.models.Pet;
      const petId = req.params.id;
      const userId = req.user.id;

      const pet = await Pet.findOne({
        where: { id: petId, owner_user_id: userId },
      });
      if (!pet) {
        return next(
          ApiError.NotFound(
            "Питомец не найден или у вас нет прав на его изменение."
          )
        );
      }

      const updateData = { ...req.body };
      delete updateData.owner_user_id;
      delete updateData.id;

      // Обработка числовых и boolean полей (пример, как у вас было, но можно улучшить)
      if (updateData.pet_type_id != null && updateData.pet_type_id !== "") {
        updateData.pet_type_id = parseInt(updateData.pet_type_id, 10);
      } else {
        updateData.pet_type_id = null;
      }

      // Проверка и преобразование возраста
      if (Object.prototype.hasOwnProperty.call(updateData, "age")) {
        // Обновляем возраст, только если он пришел
        if (
          updateData.age === undefined ||
          updateData.age === null ||
          updateData.age === "" ||
          isNaN(parseInt(updateData.age, 10)) ||
          parseInt(updateData.age, 10) < 0
        ) {
          // Если возраст пришел, но он некорректный, а поле обязательное - ошибка
          return next(
            ApiError.BadRequest(
              "Поле 'Возраст' обязательно и должно быть корректным числом при обновлении."
            )
          );
        }
        updateData.age = parseInt(updateData.age, 10);
      }

      ["is_sterilized", "is_vaccinated"].forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(updateData, key)) {
          if (updateData[key] === "true" || updateData[key] === true)
            updateData[key] = true;
          else if (updateData[key] === "false" || updateData[key] === false)
            updateData[key] = false;
          else updateData[key] = null;
        }
      });

      if (Object.prototype.hasOwnProperty.call(updateData, "pet_type_id")) {
        if (
          updateData.pet_type_id === "" ||
          updateData.pet_type_id === null ||
          updateData.pet_type_id === undefined
        ) {
          updateData.pet_type_id = null;
        } else {
          updateData.pet_type_id = parseInt(updateData.pet_type_id, 10);
          if (isNaN(updateData.pet_type_id)) {
            return next(ApiError.BadRequest("Некорректный ID типа питомца."));
          }
        }
      }

      if (req.file) {
        updateData.photo_path = `/pet_photos/${req.file.filename}`;
      } else if (
        Object.prototype.hasOwnProperty.call(req.body, "photo_path") &&
        (req.body.photo_path === null || req.body.photo_path === "")
      ) {
        updateData.photo_path = null;
      }

      await pet.update(updateData);
      const updatedPet = await Pet.findByPk(petId, {
        include: [
          {
            model: sequelize.models.PetType,
            as: "PetType",
            attributes: ["id", "name"],
          },
        ],
      });
      return res.json({ message: "Питомец успешно обновлен", pet: updatedPet });
    } catch (e) {
      console.error("Ошибка при обновлении питомца:", e);
      if (
        e.name === "SequelizeValidationError" ||
        e.name === "SequelizeUniqueConstraintError"
      ) {
        return next(
          ApiError.BadRequest("Ошибка валидации данных питомца.", e.errors)
        );
      }
      next(e);
    }
  }

  // Метод handlePetPhotosUpload больше не нужен, так как логика встроена в createPet и updatePet
  // async handlePetPhotosUpload(req, res, next) { ... }
}

module.exports = new PetController();
