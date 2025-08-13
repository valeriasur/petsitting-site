import "./Header.css";
import { useState, useEffect } from "react";
import СustomLink from "./СustomLink";
import CustomButton from "./CustomButton";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

//  Добавляем isLoggedIn и handleLogout как пропсы
export default function Header({ isLoggedIn, handleLogout }) {
  const [allSiteReviews, setAllSiteReviews] = useState([]); // Для хранения всех загруженных отзывов
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);

  useEffect(() => {
    const fetchReviewsForHeader = async () => {
      setIsLoadingReviews(true);
      try {
        // Загружаем только первую страницу, но с достаточным лимитом,
        // или все отзывы, если их немного и нет пагинации на этом эндпоинте
        // Если эндпоинт /api/site-reviews поддерживает параметры limit, можно так:
        const response = await axios.get(`${API_BASE_URL}/api/site-reviews`, {
          params: { page: 1, limit: 10 }, // Загрузим до 10 последних опубликованных отзывов
        });
        if (response.data && response.data.reviews) {
          setAllSiteReviews(response.data.reviews);
        }
      } catch (error) {
        console.error("Ошибка загрузки отзывов для хедера:", error);
        // Можно оставить старые отзывы как фоллбэк или не показывать ничего
      } finally {
        setIsLoadingReviews(false);
      }
    };

    fetchReviewsForHeader();
  }, []);

  useEffect(() => {
    if (allSiteReviews.length > 0) {
      const interval = setInterval(() => {
        setCurrentReviewIndex(
          (prevIndex) => (prevIndex + 1) % allSiteReviews.length
        );
      }, 10000); // 10 секунд на отзыв
      return () => clearInterval(interval);
    }
  }, [allSiteReviews]); // Зависимость от allSiteReviews

  const currentReviewData =
    allSiteReviews.length > 0 ? allSiteReviews[currentReviewIndex] : null;

  return (
    <header>
      <nav>
        <ul>
          <СustomLink to="/">Главная</СustomLink>
          <СustomLink to="/searchPage">Поиск помощника</СustomLink>
          <СustomLink to="/services">Услуги</СustomLink>
          <СustomLink to="/reviews">Отзывы</СustomLink>
          <СustomLink to="/becomeSitter">Стать помощником</СustomLink>

          {isLoggedIn ? (
            <>
              <СustomLink to="/profile">Личный кабинет</СustomLink>
              <CustomButton onClick={handleLogout} label="Выйти из аккаунта" />
            </>
          ) : (
            <СustomLink to="/login">Личный кабинет</СustomLink>
          )}
        </ul>
      </nav>

      {/* Контейнер для отзыва */}
      {!isLoadingReviews &&
        currentReviewData && ( // Показываем, только если загружены и есть данные
          <div className="review-container header-review-container">
            {" "}
            <div className="review-text header-review-text">
              <p>"{currentReviewData.comment}"</p>
              <h4>- {currentReviewData.displayName}</h4>{" "}
              {/* Используем displayName из SiteReviewService */}
            </div>
          </div>
        )}
      {isLoadingReviews && (
        <div className="review-container header-review-loading">
          <p>Загрузка отзывов...</p>
        </div>
      )}

      <hr className="divider" />
    </header>
  );
}
