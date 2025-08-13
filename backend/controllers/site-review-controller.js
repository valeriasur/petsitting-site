// backend/controllers/site-review-controller.js
const siteReviewService = require("../service/site-review-service");
const ApiError = require("../exceptions/api-error");
// const { validationResult } = require('express-validator'); // Если будете использовать

class SiteReviewController {
  async createSiteReview(req, res, next) {
    try {
      // Опционально: Валидация req.body с express-validator
      // const errors = validationResult(req);
      // if (!errors.isEmpty()) {
      //   return next(ApiError.BadRequest('Ошибка валидации отзыва', errors.array()));
      // }

      const { author_name, rating, comment, is_anonymous } = req.body;

      // Базовая проверка на сервере
      if (rating === undefined || rating === null || !comment) {
        return next(
          ApiError.BadRequest("Поля 'rating' и 'comment' обязательны.")
        );
      }
      if (typeof is_anonymous !== "boolean") {
        return next(
          ApiError.BadRequest("Поле 'is_anonymous' должно быть true или false.")
        );
      }

      const review = await siteReviewService.createSiteReview({
        authorName: author_name, // Передаем как authorName в сервис
        rating: parseInt(rating, 10),
        comment,
        isAnonymous: is_anonymous,
      });
      return res.status(201).json(review);
    } catch (error) {
      next(error);
    }
  }

  async getPublishedSiteReviews(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5; // Например, по 5 отзывов на странице
      const reviewsData = await siteReviewService.getPublishedSiteReviews({
        page,
        limit,
      });
      return res.json(reviewsData);
    } catch (error) {
      next(error);
    }
  }

  // --- ОПЦИОНАЛЬНО: Методы для админки/модерации ---
  // async publishSiteReview(req, res, next) {
  //   try {
  //     // Здесь нужна проверка прав администратора
  //     // if (!req.user || !req.user.isAdmin) return next(ApiError.Forbidden());
  //     const { reviewId } = req.params;
  //     const review = await siteReviewService.publishSiteReview(Number(reviewId));
  //     return res.json(review);
  //   } catch (error) {
  //     next(error);
  //   }
  // }
  //
  // async deleteSiteReview(req, res, next) {
  //    try {
  //        // Проверка прав администратора
  //        const { reviewId } = req.params;
  //        await siteReviewService.deleteSiteReview(Number(reviewId));
  //        return res.json({ message: 'Отзыв удален' });
  //    } catch (error) {
  //        next(error);
  //    }
  // }
}

module.exports = new SiteReviewController();
