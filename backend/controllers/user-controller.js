const userService = require("../service/user-service");
const UserDto = require("../dtos/user-dto");
const ApiError = require("../exceptions/api-error");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const Token = require("../models/token-model");

class UserController {
  async registration(req, res, next) {
    try {
      const { email, password } = req.body;

      // Вызов сервиса регистрации
      const result = await userService.registration(email, password); // Сервис отправит письмо

      // Ответ клиенту
      return res.status(201).json(result);
    } catch (e) {
      // Передача ошибок в центральный обработчик
      next(e);
    }
  }

  // Активация Аккаунта
  async activate(req, res, next) {
    try {
      const activationToken = req.params.token; // Получаем токен из URL
      if (!activationToken) {
        throw ApiError.BadRequest("Ссылка активации не содержит токен.");
      }

      // Вызов сервиса активации, который вернет токены и user DTO
      const userData = await userService.activate(activationToken);

      // Устанавливаем refresh token в httpOnly cookie
      res.cookie("refreshToken", userData.refreshToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });

      // Редирект на страницу успеха на фронтенде
      const clientUrl = process.env.CLIENT_URL;
      if (!clientUrl) {
        console.error(
          "CRITICAL: CLIENT_URL не определен. Не могу редиректить после активации."
        );

        return next(
          ApiError.InternalServerError(
            "Ошибка конфигурации сервера (URL клиента)."
          )
        );
      }

      return res.redirect(`${clientUrl}/profile?activated=true`);
    } catch (e) {
      // Обработка ошибок активации (неверный токен, истек срок)
      console.error("Ошибка активации аккаунта:", e.message);
      const clientUrl = process.env.CLIENT_URL;
      if (clientUrl && e instanceof ApiError && e.status === 400) {
        return res.redirect(
          `${clientUrl}/activation-error?message=${encodeURIComponent(
            e.message
          )}`
        );
      }
      next(e);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      // Вызов сервиса логина
      const userData = await userService.login(email, password);

      // Установка cookie
      res.cookie("refreshToken", userData.refreshToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });

      // Возврат токенов и данных пользователя
      return res.json(userData);
    } catch (e) {
      next(e);
    }
  }

  async logout(req, res, next) {
    try {
      // Очистка cookie
      res.clearCookie("refreshToken");
      return res.json({ message: "Выход из системы успешен" });
    } catch (e) {
      console.error("Ошибка при выходе:", e);
      res.clearCookie("refreshToken");
      return res.json({
        message:
          "Выход из системы выполнен (с возможной ошибкой очистки токена на сервере).",
      });
    }
  }

  // Обновление токенов
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.cookies; // Получаем из httpOnly cookie
      if (!refreshToken) {
        return next(ApiError.UnauthorizedError()); // Нет токена - не авторизован
      }

      // Вызываем сервис обновления токена
      const userData = await userService.refreshToken(refreshToken);

      // Устанавливаем новый refresh token в cookie
      res.cookie("refreshToken", userData.refreshToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });

      // Возвращаем новые токены и данные пользователя
      return res.json(userData);
    } catch (e) {
      // Если refresh token невалиден или истек, сервис выбросит ошибку
      console.error("Ошибка обновления токена:", e.message);

      next(ApiError.UnauthorizedError()); // Возвращаем 401
    }
  }

  // Получение Профиля
  async getProfile(req, res, next) {
    try {
      // ID пользователя берется из authMiddleware
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }

      const userInstance = await userService.findUserById(userId); // Сервис возвращает модель

      const userDto = new UserDto(userInstance); // Преобразуем в DTO
      console.log("UserController: Sending User DTO:", userDto);
      return res.json({ user: userDto }); // Отправляем DTO
    } catch (e) {
      next(e);
    }
  }

  // Получение всех пользователей
  async getUsers(req, res, next) {
    try {
      const users = await userService.getAllUsers(); // Сервис возвращает массив DTO
      return res.json(users);
    } catch (e) {
      next(e);
    }
  }

  //  Обновление Профиля
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const {
        first_name,
        last_name,
        phone,
        address_details,
        middle_name,
        confidant_first_name,
        confidant_last_name,
        confidant_middle_name,
        confidant_phone,
      } = req.body;
      const avatarFile = req.file;

      let avatarURL = req.body.avatarURL;

      if (avatarFile) {
        avatarURL = "/avatars/" + avatarFile.filename;
      }

      const updatedUserInstance = await userService.updateProfile(
        userId,
        first_name,
        last_name,
        phone,
        address_details,
        avatarURL,
        middle_name,
        confidant_first_name,
        confidant_last_name,
        confidant_middle_name,
        confidant_phone
      );

      const userDto = new UserDto(updatedUserInstance); // Преобразуем в DTO
      return res.json({ user: userDto }); // Возвращаем обновленные данные
    } catch (e) {
      next(e);
    }
  }

  //  Смена Пароля
  async changePassword(req, res, next) {
    try {
      const userId = req.user.id;
      const { oldPassword, newPassword } = req.body;
      const result = await userService.changePassword(
        userId,
        oldPassword,
        newPassword
      );
      return res.json(result);
    } catch (e) {
      next(e);
    }
  }

  // Смена Email
  async changeEmail(req, res, next) {
    try {
      const userId = req.user.id;
      const { newEmail } = req.body;

      // Вызываем сервис смены email
      const result = await userService.changeEmail(userId, newEmail);

      // Устанавливаем новый refresh token в cookie
      res.cookie("refreshToken", result.tokens.refreshToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });

      // Возвращаем сообщение, новые токены и обновленного пользователя
      return res.json({
        message: result.message,
        accessToken: result.tokens.accessToken, // Отдаем новый access token
        user: result.user, // Отдаем обновленный user DTO
      });
    } catch (e) {
      next(e);
    }
  }

  // Получение Email
  async getUserData(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await userService.findUserById(userId);
      return res.json({ email: user.email });
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new UserController();
