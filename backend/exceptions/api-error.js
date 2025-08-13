// exceptions/api-error.js

module.exports = class ApiError extends Error {
  status;
  errors;

  constructor(status, message, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }

  static UnauthorizedError() {
    return new ApiError(401, "Пользователь не авторизован");
  }

  static BadRequest(message, errors = []) {
    return new ApiError(400, message, errors);
  }

  static ForbiddenError(message = "Доступ запрещен") {
    return new ApiError(403, message);
  }

  static NotFoundError(message = "Ресурс не найден") {
    return new ApiError(404, message);
  }

  static InternalServerError(
    message = "Внутренняя ошибка сервера",
    errors = []
  ) {
    // Логируем исходную ошибку, если она передана
    if (errors instanceof Error) {
      console.error("Internal Server Error Detail:", errors);
      // Можно убрать исходную ошибку из ответа клиенту для безопасности
      errors = [];
    }
    return new ApiError(500, message, Array.isArray(errors) ? errors : []);
  }
};
