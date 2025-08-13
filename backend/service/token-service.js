// service/token-service.js
const jwt = require("jsonwebtoken");
const tokenModel = require("../models/token-model"); // Убедитесь, что модель импортирована

class TokenService {
  generateTokens(payload) {
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: "24h",
    }); // Рекомендуется меньше, напр. '30m'
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: "30d",
    });
    return { accessToken, refreshToken };
  }

  // Валидация Access Token
  validateAccessToken(token) {
    try {
      const userData = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      return userData;
    } catch (e) {
      return null; // Невалидный или истекший
    }
  }

  // Валидация Refresh Token
  validateRefreshToken(token) {
    try {
      const userData = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      return userData;
    } catch (e) {
      return null; // Невалидный или истекший
    }
  }

  async saveToken(userId, refreshToken) {
    const tokenData = await tokenModel.findOne({ where: { user_id: userId } }); // Правильное имя поля user_id
    if (tokenData) {
      tokenData.refreshToken = refreshToken;
      return tokenData.save();
    }
    // Создаем новую запись, если не найдена
    const token = await tokenModel.create({ user_id: userId, refreshToken }); // Правильное имя поля user_id
    return token;
  }

  // Поиск токена в БД
  async findToken(refreshToken) {
    const tokenData = await tokenModel.findOne({ where: { refreshToken } });
    return tokenData;
  }

  // Удаление токена из БД (для logout)
  async removeToken(refreshToken) {
    const tokenData = await tokenModel.destroy({ where: { refreshToken } });
    return tokenData; // Возвращает количество удаленных строк (0 или 1)
  }
}

module.exports = new TokenService();
