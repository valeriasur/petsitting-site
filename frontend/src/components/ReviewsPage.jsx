import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./ReviewsPage.css"; // Будем создавать этот файл

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Компонент для отображения звезд (можно вынести в отдельный файл)
const StarRatingDisplay = ({ rating }) => {
  const totalStars = 5;
  let stars = [];
  for (let i = 1; i <= totalStars; i++) {
    stars.push(
      <span key={i} className={`star ${i <= rating ? "filled" : ""}`}>
        ★
      </span>
    );
  }
  return <div className="star-rating-display">{stars}</div>;
};

// Компонент для ввода звезд (можно вынести)
const StarRatingInput = ({ rating, setRating }) => {
  return (
    <div className="star-rating-input">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${star <= rating ? "filled" : ""}`}
          onClick={() => setRating(star)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setRating(star)}
          aria-label={`Оценка ${star} из 5`}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const ReviewsPage = () => {
  const [reviewsData, setReviewsData] = useState({
    reviews: [],
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(0);
  const [newReviewComment, setNewReviewComment] = useState("");
  const [newReviewAuthorName, setNewReviewAuthorName] = useState("");
  const [newReviewIsAnonymous, setNewReviewIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Предполагаем, что у вас есть какой-то способ получить данные текущего пользователя, если он залогинен
  // Например, из контекста или localStorage. Для простоты примера, сделаем заглушку.
  // const { currentUser } = useAuth(); // Пример использования контекста аутентификации
  const [currentUser, setCurrentUser] = useState(null); // Замените на реальное получение данных пользователя

  useEffect(() => {
    // Здесь можно загрузить данные текущего пользователя, чтобы предзаполнить имя
    // Например:
    // const token = localStorage.getItem('token');
    // if (token) {
    //   axios.get(`${API_BASE_URL}/api/profile`, { headers: { Authorization: `Bearer ${token}`}})
    //     .then(res => setCurrentUser(res.data.user))
    //     .catch(err => console.error("Failed to fetch current user", err));
    // }
  }, []);

  const fetchSiteReviews = useCallback(async (pageToLoad = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/site-reviews`, {
        params: { page: pageToLoad, limit: 5 }, // По 5 отзывов
      });
      setReviewsData(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Не удалось загрузить отзывы о сайте."
      );
    } finally {
      setIsLoading(false);
    }
  }, []); // useCallback, чтобы не пересоздавать функцию на каждый рендер

  useEffect(() => {
    fetchSiteReviews(reviewsData.currentPage);
  }, [reviewsData.currentPage, fetchSiteReviews]);

  const handlePageChange = (newPage) => {
    if (
      newPage >= 1 &&
      newPage <= reviewsData.totalPages &&
      newPage !== reviewsData.currentPage &&
      !isLoading
    ) {
      setReviewsData((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (newReviewRating === 0) {
      setFormError("Пожалуйста, выберите оценку.");
      return;
    }
    if (!newReviewComment.trim()) {
      setFormError("Пожалуйста, напишите ваш комментарий.");
      return;
    }
    if (
      !newReviewIsAnonymous &&
      !newReviewAuthorName.trim() &&
      !currentUser?.first_name
    ) {
      setFormError(
        "Пожалуйста, укажите ваше имя или выберите анонимный отзыв."
      );
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    setFormSuccess("");

    const authorNameToSubmit = newReviewIsAnonymous
      ? null
      : newReviewAuthorName.trim() ||
        `${currentUser?.first_name || ""} ${
          currentUser?.last_name || ""
        }`.trim() ||
        null;

    const payload = {
      rating: newReviewRating,
      comment: newReviewComment.trim(),
      author_name: authorNameToSubmit,
      is_anonymous: newReviewIsAnonymous,
    };

    try {
      await axios.post(`${API_BASE_URL}/api/site-reviews`, payload);
      setFormSuccess("Спасибо за ваш отзыв!"); // Убрали "будет опубликован после модерации"
      setNewReviewRating(0);
      setNewReviewComment("");
      setNewReviewAuthorName("");
      setNewReviewIsAnonymous(false);
      setShowForm(false);

      // ----- ИЗМЕНЕНИЕ: Перезагружаем отзывы -----
      // Чтобы увидеть новый отзыв сразу, если он публикуется немедленно.
      // Если у вас много страниц, можно перейти на первую или остаться на текущей
      // и надеяться, что новый отзыв будет на ней (зависит от сортировки).
      // Для простоты, перейдем на первую страницу, где обычно появляются новые.
      if (reviewsData.currentPage !== 1) {
        setReviewsData((prev) => ({ ...prev, currentPage: 1 })); // Это вызовет useEffect для загрузки
      } else {
        fetchSiteReviews(1); // Если уже на первой, просто перезагружаем
      }
      // -----------------------------------------
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          "Не удалось отправить отзыв. Попробуйте позже."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (currentUser && !newReviewAuthorName && !newReviewIsAnonymous) {
      setNewReviewAuthorName(
        `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim()
      );
    }
  }, [currentUser, newReviewIsAnonymous, showForm]);

  return (
    <div className="site-reviews-page-container">
      <header className="site-reviews-main-header">
        <h1>Отзывы о нашем сервисе</h1>
        <p className="site-reviews-intro">
          Мы ценим ваше мнение и всегда рады обратной связи, чтобы становиться
          лучше для вас и ваших питомцев!
        </p>
      </header>

      <div className="site-review-action-section">
        <button
          onClick={() => setShowForm(!showForm)}
          className="site-review-toggle-button"
        >
          {showForm ? "Скрыть форму отзыва" : "Оставить отзыв о сайте"}
        </button>

        {showForm && (
          <form onSubmit={handleSubmitReview} className="site-review-form-card">
            <h3>Поделитесь вашим мнением</h3>
            <div className="form-group-sr">
              <label>Ваша оценка:</label>
              <StarRatingInput
                rating={newReviewRating}
                setRating={setNewReviewRating}
              />
            </div>
            <div className="form-group-sr">
              <label htmlFor="author_name_site_review">Ваше имя:</label>
              <input
                type="text"
                id="author_name_site_review"
                placeholder={
                  currentUser
                    ? `${currentUser.first_name || ""} ${
                        currentUser.last_name || ""
                      }`.trim()
                    : "Как вас зовут?"
                }
                value={newReviewAuthorName}
                onChange={(e) => setNewReviewAuthorName(e.target.value)}
                disabled={newReviewIsAnonymous}
                className="form-input-sr"
              />
            </div>
            <div className="form-group-sr form-group-checkbox-sr">
              <input
                type="checkbox"
                id="is_anonymous_site_review"
                checked={newReviewIsAnonymous}
                onChange={(e) => {
                  setNewReviewIsAnonymous(e.target.checked);
                  if (e.target.checked) setNewReviewAuthorName("");
                  else if (currentUser)
                    setNewReviewAuthorName(
                      `${currentUser.first_name || ""} ${
                        currentUser.last_name || ""
                      }`.trim()
                    );
                }}
              />
              <label htmlFor="is_anonymous_site_review">
                Оставить отзыв анонимно
              </label>
            </div>
            <div className="form-group-sr">
              <label htmlFor="comment_site_review">Ваш комментарий:</label>
              <textarea
                id="comment_site_review"
                rows="5"
                placeholder="Расскажите, что вам понравилось или что можно улучшить..."
                value={newReviewComment}
                onChange={(e) => setNewReviewComment(e.target.value)}
                required
                className="form-textarea-sr"
              />
            </div>
            {formError && (
              <p className="error-message form-message-sr">{formError}</p>
            )}
            {formSuccess && (
              <p className="success-message form-message-sr">{formSuccess}</p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="submit-review-button-sr"
            >
              {isSubmitting ? "Отправка..." : "Отправить отзыв"}
            </button>
          </form>
        )}
      </div>

      {isLoading && reviewsData.reviews.length === 0 && (
        <p className="loading-message-sr">Загружаем отзывы...</p>
      )}
      {error && <p className="error-message-sr">{error}</p>}

      {!isLoading && reviewsData.reviews.length === 0 && !error && (
        <p className="no-reviews-message-sr">
          Пока нет ни одного отзыва о сайте. Будьте первым!
        </p>
      )}

      {reviewsData.reviews.length > 0 && (
        <div className="site-reviews-list-sr">
          {reviewsData.reviews.map((review) => (
            <div key={review.id} className="site-review-card-item">
              <div className="site-review-card-header">
                {/* Аватар не показываем, т.к. это отзывы о сайте */}
                <div className="site-reviewer-info">
                  <span className="site-reviewer-name">
                    {review.displayName}
                  </span>
                  <span className="site-review-date">
                    {new Date(review.createdAt).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <StarRatingDisplay rating={review.rating} />
              </div>
              <p className="site-review-comment-text">{review.comment}</p>
            </div>
          ))}
        </div>
      )}

      {reviewsData.totalPages > 1 && (
        <div className="pagination-controls-sr">
          <button
            onClick={() => handlePageChange(reviewsData.currentPage - 1)}
            disabled={reviewsData.currentPage <= 1 || isLoading}
          >
            Назад
          </button>
          <span>
            Страница {reviewsData.currentPage} из {reviewsData.totalPages}
          </span>
          <button
            onClick={() => handlePageChange(reviewsData.currentPage + 1)}
            disabled={
              reviewsData.currentPage >= reviewsData.totalPages || isLoading
            }
          >
            Вперед
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewsPage;
