// controllers/sitter-controller.js
const sitterService = require("../service/sitter-service");
const ApiError = require("../exceptions/api-error");

const ALLOWED_HOUSING_TYPES = ["Квартира", "Апартаменты", "Дом"];

class SitterController {
  async submitAndVerifyRequest(req, res, next) {
    try {
      if (!req.user || !req.user.id) {
        return next(ApiError.UnauthorizedError());
      }
      const userId = req.user.id;
      console.log(`SitterController: Получена заявка от user ID: ${userId}`);

      // --- НАЧАЛО ВОССТАНАВЛИВАЕМОГО БЛОКА ---
      const { services, ...profileDetails } = req.body; // Извлекаем все, кроме services, в profileDetails

      let servicesData = {};
      if (services) {
        try {
          servicesData = JSON.parse(services); // services приходят как JSON-строка
        } catch (e) {
          console.error("Ошибка парсинга services JSON:", e);
          return next(ApiError.BadRequest("Некорректный формат данных услуг."));
        }
      }

      // Подготавливаем profileDataFromRequest
      // Это объект, который будет передан в sitterService.processApplication
      // Он должен содержать все поля, которые ожидает сервис для SitterProfile
      // и для обновления User (например, address_details, который раньше был в SitterStep3Details)
      const profileDataFromRequest = { ...profileDetails };

      // Преобразование строковых массивов из FormData
      const arrayFields = [
        "acceptedPetTypes",
        "accepted_sizes",
        "accepted_ages",
      ];
      arrayFields.forEach((field) => {
        if (
          profileDataFromRequest[field] &&
          typeof profileDataFromRequest[field] === "string"
        ) {
          try {
            profileDataFromRequest[field] = JSON.parse(
              profileDataFromRequest[field]
            );
          } catch (e) {
            console.warn(
              `Не удалось распарсить поле ${field} как JSON-массив. Оставляем как есть или обрабатываем ошибку.`
            );
            // Можно либо вернуть ошибку, либо оставить как строку, если сервис это обработает
          }
        } else if (!profileDataFromRequest[field]) {
          profileDataFromRequest[field] = []; // Если поля нет, инициализируем пустым массивом
        }
      });

      // Преобразование "Да"/"Нет" в boolean для полей, которые этого ожидают
      const booleanFieldsFromForm = [
        "has_own_dogs",
        "has_own_cats",
        "has_other_pets",
        "can_administer_meds",
        "can_give_injections",
        "has_children_under_10",
        "has_constant_supervision",
      ];
      booleanFieldsFromForm.forEach((field) => {
        if (profileDataFromRequest[field] === "Да") {
          profileDataFromRequest[field] = true;
        } else if (profileDataFromRequest[field] === "Нет") {
          profileDataFromRequest[field] = false;
        }
        // Если значение не "Да" и не "Нет", оно может остаться undefined или null,
        // и модель SitterProfile использует свои defaultValue
      });

      // Валидация и преобразование числовых полей
      const numericFields = ["experience_years"]; // Добавьте maxDogs, если он передается здесь
      numericFields.forEach((field) => {
        if (
          profileDataFromRequest[field] !== undefined &&
          profileDataFromRequest[field] !== null &&
          profileDataFromRequest[field] !== ""
        ) {
          const numValue = parseInt(profileDataFromRequest[field], 10);
          if (isNaN(numValue)) {
            // Обработка ошибки, если это критично, или установка в null/undefined
            console.warn(
              `Некорректное числовое значение для ${field}: ${profileDataFromRequest[field]}`
            );
            profileDataFromRequest[field] = null; // или undefined
          } else {
            profileDataFromRequest[field] = numValue;
          }
        } else {
          profileDataFromRequest[field] = null; // или undefined, если поле необязательное
        }
      });

      // Пример валидации housing_type
      if (
        profileDataFromRequest.housing_type &&
        !ALLOWED_HOUSING_TYPES.includes(profileDataFromRequest.housing_type)
      ) {
        return next(
          ApiError.BadRequest(
            `Недопустимый тип жилья: ${profileDataFromRequest.housing_type}`
          )
        );
      }
      // --- КОНЕЦ ВОССТАНАВЛИВАЕМОГО БЛОКА ---

      // Теперь profileDataFromRequest и servicesData должны быть определены
      const result = await sitterService.processApplication(
        userId,
        null, // userEmail, если он вам нужен в сервисе
        profileDataFromRequest,
        servicesData,
        req.files // Файлы передаются отдельно
      );
      return res.status(200).json({
        message: "Анкета ситтера успешно сохранена.", // или result.message, если сервис возвращает сообщение
        profileId: result.profileId, // Убедитесь, что сервис возвращает profileId
      });
    } catch (error) {
      console.error(
        "Критическая ошибка в SitterController.submitAndVerifyRequest:",
        error
      );
      if (error.original)
        console.error("Original Error Detail:", error.original);
      next(error);
    }
  }

  async getSitterById(req, res, next) {
    try {
      const userId = req.params.userId;
      if (!userId) {
        return next(ApiError.BadRequest("Не указан ID пользователя ситтера"));
      }
      console.log(
        `[SitterController] Запрос данных для ситтера с userId: ${userId}`
      );

      const sitterDataFull = await sitterService.getSitterDetails(userId);

      if (!sitterDataFull) {
        return next(ApiError.NotFound("Ситтер не найден"));
      }

      // Создаем копию для модификации перед отправкой клиенту
      const publicSitterData = { ...sitterDataFull };

      // Удаляем точный адрес ситтера (из SitterProfile) из публичного ответа.
      // address_area уже должен быть сформирован сервисом.
      delete publicSitterData.address_details;

      // Также удаляем личный адрес пользователя из UserAccount, если он там есть и его не нужно показывать
      // на публичной странице профиля ситтера.
      if (publicSitterData.UserAccount) {
        delete publicSitterData.UserAccount.address_details;
      }

      console.log(
        "[SitterController] Отправка данных ситтера (адрес скрыт):",
        JSON.stringify(publicSitterData, null, 2).substring(0, 500) + "..."
      );
      return res.json(publicSitterData);
    } catch (error) {
      console.error("[SitterController] Ошибка в getSitterById:", error);
      next(error); // Передаем в глобальный обработчик ошибок
    }
  }
}

module.exports = new SitterController();
