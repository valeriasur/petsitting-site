// src/components/SitterCard.js
import React from "react";
import { Link } from "react-router-dom"; // Для ссылки на профиль ситтера
import "./SitterCard.css"; // Убедитесь, что файл стилей существует и импортирован
import DefaultAvatarPlaceholderImage from "../images/iconDefaultAccount.png";

// Вспомогательная функция для склонения слова "отзыв"
function pluralizeReviews(count) {
  if (!count) return "отзывов"; // На случай 0
  const num = Math.abs(count) % 100;
  const num1 = num % 10;
  if (num > 10 && num < 20) return "отзывов";
  if (num1 > 1 && num1 < 5) return "отзыва";
  if (num1 === 1) return "отзыв";
  return "отзывов";
}

function SitterCard({ sitter }) {
  console.log(
    "SitterCard RENDER: Received props sitter:",
    JSON.stringify(sitter, null, 2)
  );
  // Лог для проверки приходящих данных (можно закомментировать после отладки)
  // console.log("SitterCard received prop:", JSON.stringify(sitter, null, 2));
  // console.log("--- Rating/Review check ---");
  // console.log("sitter.avg_rating:", sitter?.avg_rating);
  // console.log("sitter.review_count:", sitter?.review_count);
  // console.log("sitter.UserAccount.avg_rating:", sitter?.UserAccount?.avg_rating);
  // console.log("sitter.UserAccount.review_count:", sitter?.UserAccount?.review_count);
  // console.log("---------------------------");

  // Проверка базовых данных
  if (!sitter || !sitter.UserAccount) {
    console.warn(
      "SitterCard: Incomplete sitter data, returning null. Sitter object:",
      JSON.stringify(sitter, null, 2)
    );
    return null; // Не рендерим карточку, если данных недостаточно
  }

  // --- Вспомогательные функции ---

  const getDisplayName = () => {
    const firstName = sitter.UserAccount.first_name;
    const lastNameInitial = sitter.UserAccount.last_name
      ? `${sitter.UserAccount.last_name.charAt(0)}.`
      : "";
    return firstName
      ? `${firstName} ${lastNameInitial}`.trim()
      : "Имя не указано";
  };

  const getCity = () => {
    return sitter.UserAccount.city || "Город не указан";
  };

  const getMainServicePrice = () => {
    const boardingServiceId = 1; // ID услуги 'Передержка'
    const service = sitter.OfferedServices?.find(
      (s) => s.service_id === boardingServiceId
    );

    // console.log("Found service in OfferedServices for boarding (ID=1):", service); // Лог для отладки

    if (service && service.price !== null && service.price !== undefined) {
      const numericPrice = parseFloat(service.price);
      if (!isNaN(numericPrice)) {
        const unitText =
          service.price_unit === "day"
            ? "за сутки"
            : service.price_unit === "hour"
            ? "в час"
            : service.price_unit === "walk"
            ? "за выгул"
            : service.price_unit === "visit"
            ? "за визит"
            : "";
        return `от ${numericPrice.toFixed(0)} ₽ ${unitText}`;
      } else {
        console.warn("Failed to parse service price:", service.price);
        return "Ошибка цены";
      }
    }
    return "Цена не указана";
  };

  // --- ИСПРАВЛЕННАЯ Функция для формирования ПОЛНОГО URL к фото профиля ---
  const getProfilePhotoUrl = () => {
    // 1. Определяем, какой путь использовать:
    //    - Сначала пытаемся взять из SitterProfile.profile_photo_path (если ситтер загружал отдельное фото для профиля ситтера)
    //    - Если его нет, берем из UserAccount.avatarURL (обычный аватар пользователя)
    let relativePath = null;

    if (sitter.profile_photo_path) {
      // Это путь из SitterProfile (если есть)
      relativePath = sitter.profile_photo_path;
      console.log(
        "SitterCard: Using SitterProfile.profile_photo_path:",
        relativePath
      );
    } else if (sitter.UserAccount?.avatarURL) {
      // Это путь из User (аватар пользователя)
      relativePath = sitter.UserAccount.avatarURL;
      console.log("SitterCard: Using UserAccount.avatarURL:", relativePath);
    }

    if (relativePath) {
      // Убеждаемся, что путь начинается со слеша, если это относительный путь.
      // Сервер должен отдавать пути типа "/avatars/file.png" или "/sitter_photos/file.png"
      if (!relativePath.startsWith("/")) {
        console.warn(
          `SitterCard: Relative path "${relativePath}" does not start with '/'. Prepending '/'`
        );
        relativePath = "/" + relativePath;
      }

      // Формируем полный URL
      // process.env.REACT_APP_API_URL должен быть 'http://localhost:5000'
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const fullUrl = `${apiUrl}${relativePath}`; // apiUrl НЕ должен заканчиваться слешем, а relativePath должен начинаться

      console.log(`SitterCard: Generated photo URL: ${fullUrl}`);
      return fullUrl;
    } else {
      console.log(
        "SitterCard: No photo path found, using default placeholder."
      );
      return DefaultAvatarPlaceholderImage; // Ваш дефолтный плейсхолдер
    }
  };

  const getShortBio = (maxLength = 100) => {
    const bio = sitter.bio;
    // Возвращаем null, если био нет, чтобы не рендерить пустой тег <p>
    if (!bio) return null;
    if (bio.length <= maxLength) return bio;
    return `${bio.substring(0, maxLength)}...`;
  };

  // --- Получаем данные рейтинга и отзывов с верхнего уровня sitter ---
  const averageRating = sitter.avg_rating ? Number(sitter.avg_rating) : null;
  const reviewCount = sitter.review_count || 0; // Используем 0, если данных нет

  // --- JSX разметка карточки ---
  return (
    <div className="sitter-card">
      {/* Контейнер для фото */}
      <div className="sitter-card-photo-container">
        <img
          src={getProfilePhotoUrl()} // Используем ИСПРАВЛЕННУЮ функцию
          alt={`Фото ${getDisplayName()}`}
          className="sitter-card-photo"
          // Запасное изображение при ошибке загрузки
          onError={(e) => {
            console.error(`SitterCard: Failed to load image: ${e.target.src}`);
            e.target.onerror = null;
            e.target.src = DefaultAvatarPlaceholderImage;
          }}
        />
      </div>

      {/* Основная информация */}
      <div className="sitter-card-info">
        <Link
          to={`/sitter/${sitter.user_id}`}
          className="sitter-card-name-link"
        >
          <h3>{getDisplayName()}</h3>
        </Link>
        <p className="sitter-card-location">{getCity()}</p>

        {/* --- Блок рейтинга и отзывов --- */}
        {/* Отображаем, только если есть отзывы */}
        {reviewCount > 0 && (
          <div className="sitter-card-rating">
            {/* Рейтинг */}
            {averageRating !== null && (
              <span className="rating-score">
                ⭐ {averageRating.toFixed(1)}
              </span>
            )}
            {/* Количество отзывов */}
            <span className="review-count">
              {/* Можно сделать ссылкой */}
              {/* <Link to={`/sitter/${sitter.user_id}#reviews`}> */}
              {reviewCount} {pluralizeReviews(reviewCount)}
              {/* </Link> */}
            </span>
          </div>
        )}

        {/* Краткое описание (отображается, только если есть bio) */}
        {sitter.bio && (
          <p className="sitter-card-bio">
            {getShortBio(120)} {/* Показываем до 120 символов */}
          </p>
        )}
      </div>

      {/* Блок с ценой и кнопкой */}
      <div className="sitter-card-price">
        <span className="price-value">{getMainServicePrice()}</span>
        <Link
          to={`/sitter/${sitter.user_id}`}
          className="sitter-card-details-button"
        >
          Подробнее
        </Link>
      </div>
    </div>
  );
}

export default SitterCard;
