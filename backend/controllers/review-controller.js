// controllers/review-controller.js
const reviewService = require("../service/review-service");
const ApiError = require("../exceptions/api-error");
const { validationResult } = require("express-validator"); // Опционально для валидации

class ReviewController {
  async createReview(req, res, next) {
    try {
      // Опциональная валидация req.body
      // const errors = validationResult(req);
      // if (!errors.isEmpty()) {
      //     return next(ApiError.BadRequest('Ошибка валидации отзыва', errors.array()));
      // }

      const userId = req.user?.id; // ID пользователя из authMiddleware
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }

      const { bookingId, rating, comment } = req.body;

      // Проверка обязательных полей
      if (!bookingId || rating === undefined || rating === null) {
        return next(
          ApiError.BadRequest(
            "Не предоставлены все обязательные поля (bookingId, rating)."
          )
        );
      }

      const reviewData = await reviewService.createReview({
        bookingId,
        userId,
        rating,
        comment,
      });

      return res.status(201).json(reviewData); // Возвращаем созданный отзыв
    } catch (error) {
      next(error); // Передаем ошибки в центральный обработчик
    }
  }

  // TODO: Добавить другие методы контроллера (getReviews, deleteReview...)
}

module.exports = new ReviewController();
