// service/review-service.js
const { Review, Booking, User } = require("../models"); // Импортируем нужные модели
const ApiError = require("../exceptions/api-error");

class ReviewService {
  async createReview(reviewData) {
    const { bookingId, userId, rating, comment } = reviewData;

    // 1. Проверка существования бронирования
    const booking = await Booking.findByPk(bookingId, {
      include: [
        // Включаем связанные данные для проверок
        { model: User, as: "Owner" },
        { model: User, as: "Sitter" },
      ],
    });
    if (!booking) {
      throw ApiError.NotFound("Бронирование не найдено");
    }

    // 2. Проверка прав: только владелец может оставить отзыв
    if (booking.owner_user_id !== userId) {
      throw ApiError.Forbidden(
        "Вы не можете оставить отзыв для этого бронирования."
      );
    }

    // 3. Проверка статуса: отзыв можно оставить только для завершенного
    if (booking.status !== "завершенный") {
      throw ApiError.BadRequest(
        `Нельзя оставить отзыв для бронирования со статусом "${booking.status}".`
      );
    }

    // 4. Проверка, не оставлен ли уже отзыв для этого бронирования
    const existingReview = await Review.findOne({
      where: { booking_id: bookingId },
    });
    if (existingReview) {
      throw ApiError.BadRequest("Отзыв для этого бронирования уже оставлен.");
    }

    // 5. Валидация рейтинга (дополнительно к валидации модели)
    if (rating < 1 || rating > 5) {
      throw ApiError.BadRequest("Рейтинг должен быть от 1 до 5.");
    }

    // 6. Создание отзыва
    const newReview = await Review.create({
      booking_id: bookingId,
      user_id: userId, // ID автора отзыва (владельца)
      rating: rating,
      comment: comment || null,
      // Важно: Модель Review сама проставит createdAt/updatedAt
      // ID ситтера (того, о ком отзыв) НЕ хранится в Review, он связан через Booking
    });

    console.log(
      `Создан новый отзыв ID: ${newReview.id} для бронирования ID: ${bookingId}`
    );

    // Можно вернуть созданный отзыв или просто сообщение
    return newReview;
  }

  // TODO: Добавить методы для получения, обновления, удаления отзывов (если нужно)
}

module.exports = new ReviewService();
