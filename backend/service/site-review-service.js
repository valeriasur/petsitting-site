// backend/service/site-review-service.js
const { SiteReview, User } = require("../models"); // User может понадобиться, если мы захотим подставлять имя залогиненного пользователя
const ApiError = require("../exceptions/api-error");

class SiteReviewService {
  /**
   * Создает новый отзыв о сайте.
   * @param {object} reviewInput
   * @param {string} [reviewInput.userId] - ID пользователя, если он залогинен (опционально)
   * @param {string} [reviewInput.authorName] - Имя, указанное пользователем в форме
   * @param {number} reviewInput.rating - Оценка от 1 до 5
   * @param {string} reviewInput.comment - Текст отзыва
   * @param {boolean} reviewInput.isAnonymous - Флаг, указывающий, является ли отзыв анонимным
   * @returns {Promise<SiteReview>} Созданный экземпляр отзыва
   */
  async createSiteReview({ userId, authorName, rating, comment, isAnonymous }) {
    if (
      rating === undefined ||
      rating === null ||
      !comment ||
      comment.trim() === ""
    ) {
      throw ApiError.BadRequest(
        "Рейтинг и комментарий являются обязательными полями."
      );
    }
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      throw ApiError.BadRequest("Рейтинг должен быть числом от 1 до 5.");
    }
    if (typeof isAnonymous !== "boolean") {
      throw ApiError.BadRequest(
        "Некорректное значение для флага анонимности (isAnonymous)."
      );
    }

    // 2. Определение имени автора для сохранения
    let nameToSave = null;
    if (!isAnonymous) {
      if (authorName && authorName.trim() !== "") {
        nameToSave = authorName.trim();
      } else if (userId) {
        const user = await User.findByPk(userId, {
          attributes: ["first_name", "last_name"],
        });
        if (user) {
          const constructedName = `${user.first_name || ""} ${
            user.last_name || ""
          }`.trim();
          nameToSave = constructedName || "Пользователь";
        } else {
          nameToSave = "Пользователь";
        }
      } else {
        nameToSave = "Анонимный пользователь";
      }
    }
    // Если isAnonymous === true, nameToSave останется null, и в базе author_name будет null.

    // 3. Создание отзыва
    try {
      const newReview = await SiteReview.create({
        author_name: nameToSave,
        rating,
        comment,
        is_anonymous: isAnonymous,
        user_id: userId || null, // Если вы решили хранить user_id
        is_published: true, // <--- ИЗМЕНЕНИЕ: Отзывы публикуются сразу
      });
      console.log(
        `Создан и ОПУБЛИКОВАН новый отзыв о сайте ID: ${newReview.id}. Автор: ${
          nameToSave || "Аноним"
        }`
      );
      return newReview.get({ plain: true });
    } catch (error) {
      console.error("Ошибка при создании отзыва о сайте в базе данных:", error);
      throw ApiError.InternalServerError("Не удалось сохранить отзыв о сайте.");
    }
  }
  /**
   * Получает список опубликованных отзывов о сайте с пагинацией.
   * @param {object} paginationOptions
   * @param {number} [paginationOptions.page=1] - Номер страницы
   * @param {number} [paginationOptions.limit=5] - Количество отзывов на странице
   * @returns {Promise<{totalItems: number, reviews: SiteReview[], totalPages: number, currentPage: number}>}
   */
  async getPublishedSiteReviews({ page = 1, limit = 5 }) {
    const offset = (page - 1) * limit;
    try {
      const { count, rows } = await SiteReview.findAndCountAll({
        where: { is_published: true }, // Только опубликованные
        order: [["createdAt", "DESC"]], // Сначала новые
        limit,
        offset,
        distinct: true,
      });

      // Обрабатываем отображаемое имя
      const processedReviews = rows.map((reviewInstance) => {
        const review = reviewInstance.get({ plain: true });
        if (review.is_anonymous) {
          review.displayName = "Анонимный пользователь";
        } else {
          // Если отзыв не анонимный, используем author_name.
          // Если author_name пусто, а есть связь с User (UserAuthor), можно было бы взять имя оттуда.
          // Но для Варианта 1 без обязательной связи с User, полагаемся на author_name.
          review.displayName = review.author_name || "Пользователь";
        }
        // Удаляем author_name, если он не нужен на фронте, когда есть displayName
        // delete review.author_name;
        return review;
      });

      return {
        totalItems: count,
        reviews: processedReviews,
        totalPages: Math.ceil(count / limit),
        currentPage: Number(page),
      };
    } catch (error) {
      console.error("Ошибка получения опубликованных отзывов о сайте:", error);
      throw ApiError.InternalServerError(
        "Не удалось получить список отзывов о сайте."
      );
    }
  }

  // --- ОПЦИОНАЛЬНО: Методы для модерации ---

  /**
   * Публикует отзыв о сайте.
   * @param {number} reviewId - ID отзыва
   * @returns {Promise<SiteReview>} Опубликованный отзыв
   */

  async unpublishSiteReview(reviewId) {
    // Пример метода для снятия с публикации
    const review = await SiteReview.findByPk(reviewId);
    if (!review) throw ApiError.NotFound("Отзыв не найден");
    review.is_published = false;
    await review.save();
    return review.get({ plain: true });
  }

  /**
   * Удаляет отзыв о сайте.
   * @param {number} reviewId - ID отзыва
   * @returns {Promise<void>}
   */
  async deleteSiteReview(reviewId) {
    const review = await SiteReview.findByPk(reviewId);
    if (!review) {
      throw ApiError.NotFound("Отзыв о сайте не найден.");
    }
    await review.destroy();
  }
}

module.exports = new SiteReviewService();
