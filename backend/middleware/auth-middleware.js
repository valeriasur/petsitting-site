const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  if (req.method === "OPTIONS") {
    next();
    return;
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Не авторизован: отсутствует заголовок Authorization",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Не авторизован: отсутствует токен",
      });
    }

    jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          // Если токен истёк, отправляем специальную ошибку
          return res.status(401).json({
            message: "Токен истёк",
            isTokenExpired: true, // Флаг для фронтенда
            expiredAt: err.expiredAt,
          });
        } else {
          console.error("Ошибка проверки токена:", err);
          return res.status(401).json({
            message: "Не авторизован: недействительный токен",
          });
        }
      }

      // Если токен валиден
      req.user = decoded;
      next();
    });
  } catch (e) {
    console.error("Общая ошибка middleware:", e);
    return res.status(500).json({ message: "Ошибка сервера" });
  }
};
