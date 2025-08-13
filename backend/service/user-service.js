// service/user-service.js
const UserModel = require("../models/user-model");
const Token = require("../models/token-model"); // Импорт модели Token
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken"); // Нужен для refreshToken
const mailService = require("./mail-service");
const tokenService = require("./token-service");
const UserDto = require("../dtos/user-dto");
const ApiError = require("../exceptions/api-error");

const { SitterProfile } = require("../models/index"); // Убедитесь, что путь правильный

class UserService {
  async registration(email, password) {
    // 1. Проверка существования пользователя
    const candidate = await UserModel.findOne({ where: { email } });
    if (candidate) {
      throw ApiError.BadRequest(
        `Пользователь с почтовым адресом ${email} уже существует`
      );
    }

    // 2. Хеширование пароля
    const hashPassword = await bcrypt.hash(password, 3);

    // 3. Генерация токена активации
    const activationToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    // 4. Создание пользователя в БД
    const user = await UserModel.create({
      email,
      password: hashPassword,
      is_email_verified: false,
      email_verification_token: activationToken,
      email_verification_expires: expires,
    });

    // 5. Отправка письма активации
    try {
      console.log(
        `Отправка письма активации для ${email} с токеном ${activationToken}`
      );
      await mailService.sendActivationMail(email, activationToken);
      console.log(`Письмо активации для ${email} успешно отправлено.`);
    } catch (mailError) {
      console.error(
        `Критическая ошибка: Не удалось отправить письмо активации для ${email} при регистрации. Пользователь создан. Ошибка:`,
        mailError
      );
    }

    // 6. Возврат сообщения
    return {
      message:
        "Регистрация успешна. Проверьте вашу почту для активации аккаунта.",
      email: user.email,
    };
  }

  //  Активация аккаунта
  async activate(activationToken) {
    // 1. Поиск пользователя по токену
    const user = await UserModel.findOne({
      where: { email_verification_token: activationToken },
    });
    if (!user) {
      throw ApiError.BadRequest(
        "Некорректная ссылка активации (токен не найден или уже использован)."
      );
    }

    // 2. Проверка срока действия токена
    if (
      !user.email_verification_expires ||
      user.email_verification_expires < new Date()
    ) {
      // Очищаем старый токен
      user.email_verification_token = null;
      user.email_verification_expires = null;
      await user.save();
      throw ApiError.BadRequest("Срок действия ссылки активации истек.");
    }

    // 3. Активация пользователя и очистка токена
    user.is_email_verified = true;
    user.email_verification_token = null;
    user.email_verification_expires = null;
    await user.save();
    console.log(`Пользователь ${user.email} успешно активирован.`);

    // 4. Генерация JWT-токенов для авто-логина
    const userDto = new UserDto(user);
    const tokens = tokenService.generateTokens({ ...userDto });
    await tokenService.saveToken(userDto.id, tokens.refreshToken);

    // 5. Возврат токенов и DTO пользователя
    return { ...tokens, user: userDto };
  }

  async login(email, password) {
    // 1. Поиск пользователя
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw ApiError.BadRequest("Пользователь с таким email не найден");
    }

    // 2. Проверка статуса активации email
    if (!user.is_email_verified) {
      throw ApiError.BadRequest(
        "Пожалуйста, активируйте ваш аккаунт через ссылку в письме."
      );
    }

    // 3. Проверка пароля
    const isPassEquals = await bcrypt.compare(password, user.password);
    if (!isPassEquals) {
      throw ApiError.BadRequest("Неверный пароль");
    }

    // 4. Генерация токенов
    const userDto = new UserDto(user);
    const tokens = tokenService.generateTokens({ ...userDto });
    await tokenService.saveToken(userDto.id, tokens.refreshToken);

    // 5. Возврат данных
    return { ...tokens, user: userDto };
  }

  //Обновление токенов
  async refreshToken(refreshToken) {
    // 1. Валидация токена
    if (!refreshToken) {
      throw ApiError.UnauthorizedError();
    }
    const userDataFromToken = tokenService.validateRefreshToken(refreshToken);
    const tokenFromDb = await tokenService.findToken(refreshToken); // Используем метод из tokenService
    if (!userDataFromToken || !tokenFromDb) {
      throw ApiError.UnauthorizedError();
    }

    // 2. Поиск пользователя
    const user = await UserModel.findOne({
      where: { id: userDataFromToken.id },
    });
    if (!user) {
      throw ApiError.NotFoundError("Пользователь для токена не найден");
    }

    // 3. Генерация новой пары токенов
    const userDto = new UserDto(user);
    const tokens = tokenService.generateTokens({ ...userDto });
    await tokenService.saveToken(userDto.id, tokens.refreshToken); // Обновляем токен в БД

    // 4. Возврат данных
    return { ...tokens, user: userDto };
  }

  async findUserByEmail(email) {
    const user = await UserModel.findOne({ where: { email } });

    return user;
  }

  async findUserById(userId) {
    const user = await UserModel.findOne({ where: { id: userId } });
    if (!user) {
      throw ApiError.NotFoundError(`Пользователь с ID ${userId} не найден`);
    }
    return user;
  }

  async validatePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  async getAllUsers() {
    const users = await UserModel.findAll();
    // Преобразуем каждую модель пользователя в DTO
    return users.map((user) => new UserDto(user));
  }

  async updateProfile(
    id,
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
  ) {
    const user = await this.findUserById(id);

    if (first_name !== undefined) user.first_name = first_name;
    if (last_name !== undefined) user.last_name = last_name;
    if (phone !== undefined) user.phone = phone;
    if (address_details !== undefined) {
      user.address_details = address_details;
      console.log(
        `[UserService - updateProfile] Updating user ${id} address_details to:`,
        address_details
      );
    } else {
      console.log(
        `[UserService - updateProfile] address_details not provided for user ${id}, existing value will be kept or set to null if it was null.`
      );
    }
    let oldAvatarURL = user.avatarURL;
    // Обновляем аватар пользователя, если новый URL предоставлен
    if (avatarURL !== undefined) {
      user.avatarURL = avatarURL;
    }

    if (middle_name !== undefined) user.middle_name = middle_name;
    if (confidant_first_name !== undefined)
      user.confidant_first_name = confidant_first_name;
    if (confidant_last_name !== undefined)
      user.confidant_last_name = confidant_last_name;
    if (confidant_middle_name !== undefined)
      user.confidant_middle_name = confidant_middle_name;
    if (confidant_phone !== undefined) user.confidant_phone = confidant_phone;

    await user.save();
    console.log(
      "[UserService - updateProfile] Updated User in DB:",
      user.toJSON()
    );

    if (avatarURL !== undefined && user.is_sitter) {
      const sitterProfile = await SitterProfile.findOne({
        where: { user_id: id },
      });
      if (sitterProfile) {
        sitterProfile.profile_photo_path = user.avatarURL;
        await sitterProfile.save();
        console.log(
          `SitterProfile photo updated for user ${id} to ${avatarURL}`
        );
      }
    }

    console.log("Updated User in DB:", user.toJSON());
    return user; // Возвращаем обновленный экземпляр модели
  }

  async changePassword(userId, oldPassword, newPassword) {
    const user = await this.findUserById(userId);

    const isPasswordValid = await this.validatePassword(
      oldPassword,
      user.password
    );
    if (!isPasswordValid) {
      throw ApiError.BadRequest("Неверный старый пароль");
    }

    const hashPassword = await bcrypt.hash(newPassword, 3);
    user.password = hashPassword;
    await user.save();

    return { message: "Пароль успешно изменен" };
  }

  async changeEmail(userId, newEmail) {
    // 1. Проверка валидности формата
    if (!this.isValidEmail(newEmail)) {
      throw ApiError.BadRequest("Некорретный формат email");
    }

    // 2. Проверка на уникальность
    const emailExists = await UserModel.findOne({ where: { email: newEmail } });
    if (emailExists && emailExists.id !== userId) {
      // Убедимся, что это не тот же самый пользователь
      throw ApiError.BadRequest(
        "Этот email уже используется другим пользователем"
      );
    }

    // 3. Обновление email
    const user = await this.findUserById(userId);
    if (user.email === newEmail) {
      throw ApiError.BadRequest("Новый email совпадает с текущим");
    }
    user.email = newEmail;
    // При смене email разумно сбросить флаг верификации
    user.is_email_verified = false;
    // Нужно также сгенерировать и отправить новый токен активации
    const activationToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);
    user.email_verification_token = activationToken;
    user.email_verification_expires = expires;

    await user.save();

    // Отправляем письмо для верификации нового email
    try {
      await mailService.sendActivationMail(newEmail, activationToken);
    } catch (mailError) {
      console.error(
        `Не удалось отправить письмо активации на новый email ${newEmail}:`,
        mailError
      );
    }

    // Генерируем новые JWT-токены, тк payload изменился
    const userDto = new UserDto(user);
    const tokens = tokenService.generateTokens({ ...userDto });
    await tokenService.saveToken(userDto.id, tokens.refreshToken);

    return {
      message:
        "Email успешно изменен. Пожалуйста, подтвердите новый адрес через письмо.",
      tokens, // Возвращаем новые токены
      user: userDto, // Возвращаем обновленный DTO
    };
  }

  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  async saveToken(userId, refreshToken) {
    return tokenService.saveToken(userId, refreshToken);
  }
}

module.exports = new UserService();
