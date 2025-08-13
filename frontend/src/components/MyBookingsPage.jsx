import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./ProfileForm.css";
import { useOutletContext, Link } from "react-router-dom";

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

// ID услуг
const BOARDING_SERVICE_ID = 1;
const WALKING_SERVICE_ID = 2;
const HOUSESITTING_SERVICE_ID = 3;
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const DefaultPetImagePlaceholder = "/images/zag.png";

const getFullPhotoUrl = (relativePath) => {
  if (!relativePath) return DefaultPetImagePlaceholder;
  if (relativePath.startsWith("http") || relativePath.startsWith("data:"))
    return relativePath;
  const cleanApiUrl = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  const cleanRelativePath = relativePath.startsWith("/")
    ? relativePath.substring(1)
    : relativePath;
  return `${cleanApiUrl}/${cleanRelativePath}`;
};

function BookingCard({ booking, userRole, onBookingUpdate }) {
  // Логируем конкретного питомца для этого бронирования, чтобы проверить его данные
  console.log("BookingCard - Питомец для этого бронирования:", booking.Pet);
  console.log("BookingCard - Pet photo_path:", booking.Pet?.photo_path);

  const isOwnerView = userRole === "owner";
  const otherParty = isOwnerView ? booking.Sitter : booking.Owner;
  const pet = booking.Pet; // Этот 'pet' относится к данному бронированию
  const service = booking.Service;

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showPetDetails, setShowPetDetails] = useState(false);

  let ownerAddressForDisplay = null;
  let sitterAddressForDisplay = null;
  let ownerAddressMissingForRequiredService = false;
  let sitterAddressMissingForRequiredService = false;

  const isBookingConfirmedOrCompleted =
    booking.status === "подтвержденный" || booking.status === "завершенный";

  if (isBookingConfirmedOrCompleted && service?.id) {
    const numericServiceId = Number(service.id);
    switch (numericServiceId) {
      case BOARDING_SERVICE_ID:
        sitterAddressForDisplay = booking.Sitter?.address_details;
        ownerAddressForDisplay = booking.Owner?.address_details;
        if (!sitterAddressForDisplay)
          sitterAddressMissingForRequiredService = true;
        if (!ownerAddressForDisplay)
          ownerAddressMissingForRequiredService = true;
        break;
      case WALKING_SERVICE_ID:
      case HOUSESITTING_SERVICE_ID:
        ownerAddressForDisplay = booking.Owner?.address_details;
        if (!ownerAddressForDisplay)
          ownerAddressMissingForRequiredService = true;
        break;
      default:
        break;
    }
  }

  const togglePetDetails = () => {
    setShowPetDetails(!showPetDetails);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openPetPhotoLightbox = () => {
    if (pet && pet.photo_path) {
      setLightboxOpen(true);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleDownloadContract = async () => {
    if (!booking || !booking.id || !booking.contract_path) return;
    setIsActionLoading(true);
    setActionError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setActionError("Для скачивания договора необходима авторизация.");
        setIsActionLoading(false);
        return;
      }
      const response = await axios.get(
        `${API_BASE_URL}/api/bookings/${booking.id}/contract`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const contentDisposition = response.headers["content-disposition"];
      let filename = `Договор_бронирования_${booking.id}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch && filenameMatch.length === 2)
          filename = filenameMatch[1];
      }
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        "Ошибка скачивания договора:",
        error.response?.data || error.message
      );
      setActionError(
        error.response?.data?.message || "Не удалось скачать договор."
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAction = async (
    actionUrl,
    method = "put",
    data = {},
    successMessage,
    errorMessagePrefix
  ) => {
    if (
      !booking ||
      !booking.id ||
      (isActionLoading && !actionUrl.includes("reviews"))
    )
      return;
    if (
      method === "put" &&
      actionUrl.includes("cancel-sitter") &&
      !cancellationReason.trim()
    ) {
      setActionError("Пожалуйста, укажите причину отмены.");
      return;
    }
    if (
      actionUrl.includes("decline") ||
      actionUrl.includes("cancel-owner") ||
      actionUrl.includes("complete-sitter")
    ) {
      if (
        !window.confirm(
          `Вы уверены, что хотите выполнить это действие для бронирования #${booking.id}?`
        )
      )
        return;
    }

    if (actionUrl.includes("reviews")) setReviewSubmitting(true);
    else setIsActionLoading(true);
    setActionError(null);
    if (actionUrl.includes("reviews")) {
      setReviewSuccess(false);
      setReviewError(null);
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Нужна авторизация");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      let response;
      if (method === "put") response = await axios.put(actionUrl, data, config);
      else if (method === "post")
        response = await axios.post(actionUrl, data, config);

      console.log(`${successMessage}:`, response.data);
      if (typeof onBookingUpdate === "function") onBookingUpdate(response.data);
      if (actionUrl.includes("cancel-sitter")) {
        setShowReasonInput(false);
        setCancellationReason("");
      }
      if (actionUrl.includes("reviews")) {
        setReviewSuccess(true);
        setShowReviewForm(false);
      }
    } catch (error) {
      console.error(
        `Ошибка при ${errorMessagePrefix}:`,
        error.response?.data || error.message
      );
      const errorMsg =
        error.response?.data?.message ||
        `Не удалось ${errorMessagePrefix.toLowerCase()}.`;
      if (actionUrl.includes("reviews")) setReviewError(errorMsg);
      else setActionError(errorMsg);
    } finally {
      if (actionUrl.includes("reviews")) setReviewSubmitting(false);
      else setIsActionLoading(false);
    }
  };

  const handleCancelAsSitter = () =>
    handleAction(
      `${API_BASE_URL}/api/bookings/${booking.id}/cancel-sitter`,
      "put",
      { reason: cancellationReason },
      "Бронирование отменено работником",
      "отмены работником"
    );
  const handleDecline = () =>
    handleAction(
      `${API_BASE_URL}/api/bookings/${booking.id}/decline`,
      "put",
      {},
      "Бронирование отклонено",
      "отклонения"
    );
  const handleCancelAsOwner = () =>
    handleAction(
      `${API_BASE_URL}/api/bookings/${booking.id}/cancel-owner`,
      "put",
      {},
      "Бронирование отменено владельцем",
      "отмены владельцем"
    );
  const handleConfirm = () =>
    handleAction(
      `${API_BASE_URL}/api/bookings/${booking.id}/confirm`,
      "put",
      {},
      "Бронирование подтверждено",
      "подтверждения"
    );
  const handleCompleteBySitter = () =>
    handleAction(
      `${API_BASE_URL}/api/bookings/${booking.id}/complete-sitter`,
      "put",
      {},
      "Бронирование завершено работником",
      "завершения работником"
    );
  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (reviewRating === 0) {
      setReviewError("Пожалуйста, выберите оценку.");
      return;
    }
    handleAction(
      `${API_BASE_URL}/api/reviews`,
      "post",
      { bookingId: booking.id, rating: reviewRating, comment: reviewComment },
      "Отзыв отправлен",
      "отправки отзыва"
    );
  };

  const renderActionButtons = () => {
    let buttons = [];

    if (pet) {
      buttons.push(
        <button
          key="pet-details"
          onClick={togglePetDetails}
          className="button pet-details-button"
          disabled={isActionLoading && !showPetDetails}
        >
          {showPetDetails ? "Скрыть данные питомца" : "Данные питомца"}
        </button>
      );
    }

    if (
      (booking.status === "подтвержденный" ||
        booking.status === "завершенный") &&
      booking.contract_path
    ) {
      buttons.push(
        <button
          key="download-contract"
          onClick={handleDownloadContract}
          className="button download-contract-button"
          disabled={isActionLoading}
        >
          {isActionLoading ? "Загрузка..." : "Скачать договор"}
        </button>
      );
    }

    if (
      isActionLoading &&
      !reviewSubmitting &&
      buttons.length === 0 &&
      !showPetDetails
    ) {
      return <p className="action-loading">Обработка...</p>;
    }

    if (!isOwnerView) {
      if (booking.status === "в ожидании" && !showReasonInput) {
        buttons.push(
          <React.Fragment key="sitter-pending-actions">
            <button
              onClick={handleConfirm}
              className="button confirm-button"
              disabled={isActionLoading}
            >
              Подтвердить
            </button>
            <button
              onClick={handleDecline}
              className="button decline-button"
              disabled={isActionLoading}
            >
              Отклонить
            </button>
          </React.Fragment>
        );
      } else if (booking.status === "подтвержденный" && !showReasonInput) {
        const now = new Date();
        const endDate = new Date(booking.end_datetime);
        const canComplete = now > endDate;

        if (canComplete) {
          buttons.push(
            <button
              key="complete-sitter"
              onClick={handleCompleteBySitter}
              className="button complete-button"
              disabled={isActionLoading}
            >
              Завершить
            </button>
          );
        }
        buttons.push(
          <button
            key="cancel-sitter-init"
            onClick={() => setShowReasonInput(true)}
            className="button cancel-button"
            disabled={isActionLoading}
          >
            Отменить
          </button>
        );
      }
    } else {
      if (
        (booking.status === "в ожидании" ||
          booking.status === "подтвержденный") &&
        !showReasonInput
      ) {
        buttons.push(
          <button
            key="cancel-owner"
            onClick={handleCancelAsOwner}
            className="button cancel-button"
            disabled={isActionLoading}
          >
            Отменить
          </button>
        );
      }

      if (
        booking.status === "завершенный" &&
        !booking.Review && // Проверяем, что объекта Review нет в данных бронирования
        !reviewSuccess &&
        !showReviewForm
      ) {
        buttons.push(
          <button
            key="leave-review"
            onClick={() => {
              setShowReviewForm(true);
              setReviewError(null);
            }}
            className="button review-button action-button-unified"
          >
            Оставить отзыв
          </button>
        );
      }
    }

    if (buttons.length > 0) {
      buttons.sort((a, b) => {
        if (a.key === "pet-details") return -1;
        if (b.key === "pet-details") return 1;
        return 0;
      });
      return <>{buttons}</>;
    }
    return null;
  };

  return (
    <div
      className={`booking-card status-${booking.status.replace(
        /[^a-z0-9]/gi,
        "-"
      )}`}
    >
      <div className="booking-card-header">
        <span className="booking-service">
          {service?.description || service?.name || "Услуга не найдена"}
        </span>
        <span
          className={`booking-status status-badge-${booking.status.replace(
            /[^a-z0-9]/gi,
            "-"
          )}`}
        >
          {booking.status}
        </span>
      </div>
      <div className="booking-card-body">
        <div className="booking-details">
          <p>
            <strong>{isOwnerView ? "Специалист" : "Владелец"}:</strong>{" "}
            {otherParty?.first_name || "Имя не указано"}{" "}
            {otherParty?.last_name ? otherParty.last_name.charAt(0) + "." : ""}
          </p>
          <p>
            <strong>Питомец:</strong> {pet?.name || "Имя не указано"} (
            {pet?.PetType?.name || "Тип не указан"})
          </p>

          {showPetDetails && pet && (
            <div className="pet-details-modal">
              <h4>Анкета питомца: {pet.name}</h4>
              {pet.photo_path && (
                <div
                  className="pet-profile-photo-container"
                  onClick={openPetPhotoLightbox}
                >
                  <img
                    src={getFullPhotoUrl(pet.photo_path)}
                    alt={`Фото ${pet.name}`}
                    className="pet-profile-photo-thumbnail"
                  />
                  <span className="pet-photo-zoom-hint">
                    Нажмите для увеличения
                  </span>
                </div>
              )}

              {!pet.photo_path && (
                <div className="pet-profile-photo-container no-photo">
                  <span>Фото не добавлено</span>
                </div>
              )}
              <div className="pet-info-grid">
                <p>
                  <strong>Тип:</strong> {pet.PetType?.name || "Не указан"}
                </p>
                <p>
                  <strong>Порода:</strong> {pet.breed || "Не указана"}
                </p>

                <p>
                  <strong>Возраст:</strong>{" "}
                  {pet.age !== null && pet.age !== undefined
                    ? `${pet.age} ${
                        pet.age === 1
                          ? "год"
                          : pet.age >= 2 && pet.age <= 4
                          ? "года"
                          : "лет"
                      }`
                    : "Не указан"}
                </p>

                <p>
                  <strong>Пол:</strong> {pet.gender || "Не указан"}
                </p>
                <p>
                  <strong>Размер:</strong> {pet.size || "Не указан"}
                </p>
                <p>
                  <strong>Стерилизован/Кастрирован:</strong>{" "}
                  {pet.is_sterilized === true
                    ? "Да"
                    : pet.is_sterilized === false
                    ? "Нет"
                    : "Не указано"}
                </p>
                <p>
                  <strong>Прививки:</strong>{" "}
                  {pet.is_vaccinated === true
                    ? "Да"
                    : pet.is_vaccinated === false
                    ? "Нет"
                    : "Не указано"}
                </p>
                <p>
                  <strong>Отношение к другим животным:</strong>{" "}
                  {pet.animal_neighborhood || "Не указано"}
                </p>
                <p>
                  <strong>Как переносит одиночество:</strong>{" "}
                  {pet.alone_home || "Не указано"}
                </p>
                {pet.description && (
                  <p className="pet-description-full">
                    <strong>Описание/Особенности:</strong> {pet.description}
                  </p>
                )}
              </div>
              <button
                onClick={togglePetDetails}
                className="button close-pet-details-button"
              >
                Закрыть
              </button>
            </div>
          )}

          {service &&
          (Number(service.id) === WALKING_SERVICE_ID ||
            Number(service.id) === HOUSESITTING_SERVICE_ID) ? (
            <p>
              <strong>Дата и время:</strong>{" "}
              {formatDateTime(booking.start_datetime)} -{" "}
              {new Date(booking.end_datetime).toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          ) : (
            <p>
              <strong>Даты:</strong> {formatDate(booking.start_datetime)} -{" "}
              {formatDate(booking.end_datetime)}
            </p>
          )}

          {booking.notes_for_sitter && (
            <p>
              <strong>Примечания:</strong> {booking.notes_for_sitter}
            </p>
          )}
          {booking.total_price && (
            <p>
              <strong>Стоимость:</strong>{" "}
              {parseFloat(booking.total_price).toFixed(0)} ₽
            </p>
          )}

          {isOwnerView && booking.Sitter?.phone && (
            <p>
              <strong>Телефон ситтера:</strong> {booking.Sitter.phone}
            </p>
          )}
          {!isOwnerView && booking.Owner?.phone && (
            <p>
              <strong>Телефон владельца:</strong> {booking.Owner.phone}
            </p>
          )}

          {sitterAddressForDisplay && (
            <p>
              <strong>Адрес специалиста:</strong> {sitterAddressForDisplay}
            </p>
          )}
          {sitterAddressMissingForRequiredService && (
            <p className="warning-message">
              <strong>Адрес специалиста:</strong> (не указан)
            </p>
          )}

          {ownerAddressForDisplay && (
            <p>
              <strong>Адрес владельца:</strong> {ownerAddressForDisplay}
            </p>
          )}
          {ownerAddressMissingForRequiredService && (
            <p className="warning-message">
              <strong>Адрес владельца:</strong> (не указан).
              {isOwnerView ? " Вам" : " Владельцу"} необходимо{" "}
              <Link to="/profile">указать адрес в профиле</Link>.
            </p>
          )}
        </div>
        <div className="booking-actions">
          {renderActionButtons()}
          {actionError && !reviewError && (
            <p className="error-message action-error">{actionError}</p>
          )}
          {showReasonInput && !isActionLoading && (
            <div className="cancellation-reason-input">
              <textarea
                rows="3"
                placeholder="Укажите причину отмены..."
                value={cancellationReason}
                onChange={(e) => {
                  setCancellationReason(e.target.value);
                  if (actionError) setActionError(null);
                }}
              />
              <div className="reason-buttons">
                <button
                  onClick={handleCancelAsSitter}
                  className="button confirm-button"
                >
                  Подтвердить отмену
                </button>
                <button
                  onClick={() => {
                    setShowReasonInput(false);
                    setActionError(null);
                    setCancellationReason("");
                  }}
                  className="button cancel-button"
                >
                  Назад
                </button>
              </div>
            </div>
          )}
          {showReviewForm && !reviewSuccess && (
            <form onSubmit={handleReviewSubmit} className="review-form">
              <h5>Оставить отзыв</h5>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={star <= reviewRating ? "star filled" : "star"}
                    onClick={() => {
                      setReviewRating(star);
                      if (reviewError) setReviewError(null);
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>
              <textarea
                rows="4"
                placeholder="Ваш комментарий (необязательно)..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
              {reviewError && (
                <p className="error-message action-error">{reviewError}</p>
              )}
              <div className="review-form-buttons">
                <button
                  type="submit"
                  className="button confirm-button"
                  disabled={reviewSubmitting}
                >
                  {reviewSubmitting ? "Отправка..." : "Отправить отзыв"}
                </button>
                <button
                  type="button"
                  className="button cancel-button"
                  onClick={() => {
                    setShowReviewForm(false);
                    setReviewError(null);
                    setReviewRating(0);
                    setReviewComment("");
                  }}
                  disabled={reviewSubmitting}
                >
                  Отмена
                </button>
              </div>
            </form>
          )}
          {reviewSuccess && (
            <p className="success-message review-success">
              Спасибо за ваш отзыв!
            </p>
          )}
        </div>
      </div>

      {lightboxOpen && pet && pet.photo_path && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          slides={[{ src: getFullPhotoUrl(pet.photo_path) }]}
          plugins={[Zoom]}
        />
      )}
    </div>
  );
}

function MyBookingsPage() {
  const [bookingsAsOwner, setBookingsAsOwner] = useState([]);
  const [bookingsAsSitter, setBookingsAsSitter] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const context = useOutletContext();
  const currentUserData = context?.userData?.user;

  const handleBookingUpdate = useCallback(
    (updatedBooking) => {
      if (!updatedBooking || !updatedBooking.id || !currentUserData) return;

      if (updatedBooking.owner_user_id === currentUserData.id) {
        setBookingsAsOwner((prev) =>
          prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b))
        );
      }
      if (
        currentUserData.is_sitter &&
        updatedBooking.sitter_user_id === currentUserData.id
      ) {
        setBookingsAsSitter((prev) =>
          prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b))
        );
      }
      console.log("Состояние бронирования обновлено:", updatedBooking);
    },
    [currentUserData]
  );

  useEffect(() => {
    const fetchBookings = async () => {
      if (!currentUserData) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Необходимо войти в систему для просмотра бронирований.");
        setIsLoading(false);
        return;
      }
      try {
        const ownerPromise = axios.get(
          `${API_BASE_URL}/api/bookings/my-as-owner`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const sitterPromise = currentUserData.is_sitter
          ? axios.get(`${API_BASE_URL}/api/bookings/my-as-sitter`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          : Promise.resolve({ data: [] });

        const [ownerResponse, sitterResponse] = await Promise.all([
          ownerPromise,
          sitterPromise,
        ]);
        setBookingsAsOwner(
          Array.isArray(ownerResponse.data) ? ownerResponse.data : []
        );
        setBookingsAsSitter(
          Array.isArray(sitterResponse.data) ? sitterResponse.data : []
        );
      } catch (err) {
        console.error(
          "Критическая ошибка загрузки бронирований:",
          err.response?.data || err.message
        );
        setError(
          err.response?.data?.message || "Не удалось загрузить бронирования."
        );
      } finally {
        setIsLoading(false);
      }
    };
    if (currentUserData) {
      fetchBookings();
    } else {
      setIsLoading(false);
    }
  }, [currentUserData]);

  return (
    <div className="my-bookings-page">
      <h2>Мои Бронирования</h2>
      {isLoading && <p>Загрузка бронирований...</p>}
      {error && <p className="error-message">{error}</p>}
      {!isLoading && !error && currentUserData && (
        <>
          <div className="bookings-section">
            <h3>Мои заказы (Вы - владелец питомца)</h3>
            {bookingsAsOwner.length > 0 ? (
              <div className="bookings-list">
                {bookingsAsOwner.map((booking) => (
                  <BookingCard
                    key={`owner-${booking.id}`}
                    booking={booking}
                    userRole="owner"
                    onBookingUpdate={handleBookingUpdate}
                  />
                ))}
              </div>
            ) : (
              <p>У вас пока нет активных или завершенных заказов.</p>
            )}
          </div>
          {currentUserData.is_sitter && (
            <div className="bookings-section">
              <h3>Заказы у меня (Вы - специалист)</h3>
              {bookingsAsSitter.length > 0 ? (
                <div className="bookings-list">
                  {bookingsAsSitter.map((booking) => (
                    <BookingCard
                      key={`sitter-${booking.id}`}
                      booking={booking}
                      userRole="sitter"
                      onBookingUpdate={handleBookingUpdate}
                    />
                  ))}
                </div>
              ) : (
                <p>Вам пока не поступало запросов на бронирование.</p>
              )}
            </div>
          )}
        </>
      )}
      {!isLoading && !currentUserData && !error && (
        <p>Загрузка данных пользователя...</p>
      )}
    </div>
  );
}
export default MyBookingsPage;
