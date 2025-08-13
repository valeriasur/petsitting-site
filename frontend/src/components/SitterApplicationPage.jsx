// components/SitterApplicationPage.js
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate, Outlet } from "react-router-dom";
import "./SitterApplicationPage.css"; // Убедитесь, что файл существует
// УДАЛИТЬ ненужные импорты:
// import SitterStep1DisplayInfo from "./SitterStep1DisplayInfo";
// import ProfileForm from "./ProfileForm";
import SitterStep2Services from "./SitterStep2Services";
import SitterStep3Details from "./SitterStep3Details";
import SitterStep4Confirmation from "./SitterStep4Confirmation";

export default function SitterApplicationPage() {
  // --- Состояния Компонента ---
  const [showForm, setShowForm] = useState(false); // Показать/скрыть анкету
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false); // Статус авторизации
  const [currentStep, setCurrentStep] = useState(1); // Текущий шаг анкеты
  const totalSteps = 4; // Общее кол-во шагов

  // --- Состояния для данных ---
  const [isLoadingProfile, setIsLoadingProfile] = useState(false); // Загрузка профиля
  const [profileError, setProfileError] = useState(null); // Ошибка загрузки профиля
  // Хранит данные, полученные из GET /api/profile (ожидается { user: {...} })
  const [fetchedUserData, setFetchedUserData] = useState(null);
  // Данные, собранные на шагах анкеты
  const [step2Data, setStep2Data] = useState({ services: {} }); // Услуги
  const [step3Data, setStep3Data] = useState({ details: {} }); // Детали объявления

  // --- Состояния для отправки финальной анкеты ---
  const [isSubmitting, setIsSubmitting] = useState(false); // Идет отправка POST /sitter-application
  const [submitError, setSubmitError] = useState(null); // Ошибка отправки анкеты
  const [submitSuccess, setSubmitSuccess] = useState(false); // Успешная отправка анкеты

  const navigate = useNavigate();

  // --- Функция обновления данных профиля (Callback для ProfileForm) ---
  // Вызывается из ProfileForm после успешного PUT /api/profile
  const handleProfileUpdate = useCallback((updatedUserData) => {
    console.log(
      "SitterApplicationPage: handleProfileUpdate called with:",
      updatedUserData
    );
    // Обновляем состояние fetchedUserData новыми данными
    // updatedUserData должно быть в формате { user: {...} }
    if (updatedUserData && updatedUserData.user) {
      setFetchedUserData(updatedUserData);
      console.log("SitterApplicationPage: fetchedUserData updated.");
    } else {
      console.warn(
        "SitterApplicationPage: Received invalid data in handleProfileUpdate. State not updated."
      );
    }
  }, []); // useCallback с пустым массивом зависимостей

  // --- Формируем объект контекста для передачи в Outlet (на Шаге 1) ---
  // Передаем и данные, и функцию обновления
  const outletContextValue = {
    userData: fetchedUserData,
    onProfileUpdate: handleProfileUpdate,
  };

  // --- Навигация по шагам ---
  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // На последнем шаге вызываем отправку всей анкеты
      handleSubmitApplication();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // --- Проверка токена при монтировании ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsUserLoggedIn(!!token); // Устанавливаем true, если токен есть, иначе false
  }, []);

  // --- Загрузка данных профиля при клике "Подать заявку" ---
  const handleApplyClick = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("Пользователь не авторизован, перенаправление на /login");
      navigate("/login");
      return;
    }

    setShowForm(false);
    setProfileError(null);
    setIsLoadingProfile(true);

    try {
      const response = await axios.get("http://localhost:5000/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(
        "SitterApplicationPage: Profile data fetched:",
        response.data
      );
      if (response.data && response.data.user) {
        setFetchedUserData(response.data); // Ожидаем { user: {...} }
        setShowForm(true); // Показываем анкету
      } else {
        throw new Error("Некорректный формат данных профиля от сервера.");
      }
    } catch (error) {
      console.error("Ошибка при загрузке профиля:", error);
      setProfileError(
        error.message ||
          "Не удалось загрузить данные профиля. Попробуйте еще раз."
      );
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // --- Отправка финальной анкеты ситтера ---
  const handleSubmitApplication = async () => {
    console.log("Начало отправки анкеты ситтера...");
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    const token = localStorage.getItem("token");
    if (!token) {
      setSubmitError("Ошибка аутентификации. Пожалуйста, войдите снова.");
      setIsSubmitting(false);
      navigate("/login");
      return;
    }

    // 1. Создаем FormData для отправки файлов и данных
    const formData = new FormData();

    // 2. Добавляем данные Шага 3 (Детали объявления)
    const details = step3Data.details || {};
    Object.entries(details).forEach(([key, value]) => {
      if (key === "profilePhoto" && value instanceof File) {
        formData.append(key, value, value.name);
      } else if (key === "apartmentPhotos" && Array.isArray(value)) {
        value.forEach((file) => {
          if (file instanceof File) {
            formData.append(key, file, file.name); // Используем одинаковый ключ для multiple files
          }
        });
      } else if (Array.isArray(value)) {
        // Массивы чекбоксов (accepted_sizes, accepted_ages) отправляем как JSON-строку
        formData.append(key, JSON.stringify(value));
      } else if (value !== null && value !== undefined && value !== "") {
        // Простые значения (строки, числа, булевы 'Да'/'Нет')
        formData.append(key, value);
      }
    });

    // 3. Добавляем данные Шага 2 (Услуги) как JSON-строку
    if (step2Data.services && Object.keys(step2Data.services).length > 0) {
      formData.append("services", JSON.stringify(step2Data.services));
    }

    // 4. Логируем ключи FormData перед отправкой (для отладки)
    console.log("Отправляемые данные (FormData ключи):");
    for (let key of formData.keys()) {
      console.log(`  ${key}:`, formData.getAll(key)); // getAll покажет массивы файлов
    }

    // 5. Отправляем POST запрос
    try {
      const response = await axios.post(
        "http://localhost:5000/api/sitter-application", // Ваш эндпоинт
        formData, // Передаем FormData
        {
          headers: {
            Authorization: `Bearer ${token}`,
            // 'Content-Type': 'multipart/form-data' // Axios обычно ставит сам
          },
        }
      );

      console.log("Ответ сервера на отправку анкеты:", response.data);
      setSubmitSuccess(true); // Устанавливаем флаг успеха
      // alert("Анкета успешно отправлена! Проверьте почту для подтверждения."); // Можно заменить на сообщение ниже
      // Можно перенаправить пользователя
      // navigate('/'); // Например, на главную
    } catch (error) {
      console.error(
        "Ошибка при отправке анкеты ситтера:",
        error.response ? error.response.data : error
      );
      const errorMessage =
        error.response?.data?.message ||
        "Не удалось отправить анкету. Попробуйте еще раз.";
      setSubmitError(errorMessage);
      // alert(`Ошибка отправки анкеты: ${errorMessage}`); // Заменяем на сообщение ниже
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- JSX Рендеринг ---
  return (
    <div className="sitter-application-container">
      {/* Индикатор загрузки профиля */}
      {isLoadingProfile && (
        <p className="loading-message">Загрузка данных профиля...</p>
      )}

      {/* Ошибка загрузки профиля */}
      {profileError && !isLoadingProfile && (
        <p className="error-message">{profileError}</p>
      )}

      {/* Кнопка "Подать заявку" (если форма не показана и нет загрузки/ошибки) */}
      {!showForm && !isLoadingProfile && !profileError && (
        <div className="apply-button-section">
          <p>
            Хотите помогать владельцам заботиться об их питомцах? <br />{" "}
            Заполните анкету и начните получать заказы!
          </p>
          <button
            className="apply-button"
            onClick={handleApplyClick}
            disabled={!isUserLoggedIn}
          >
            Подать заявку
          </button>
          {!isUserLoggedIn && (
            <p className="form-description info-message">
              Заявку можно подать, будучи зарегистрированным на сайте.
            </p>
          )}
        </div>
      )}

      {/* Многошаговая анкета (если форма показана и данные загружены) */}
      {showForm && fetchedUserData && (
        <div className="sitter-form-multi-step">
          <h3>Анкета помощника</h3>

          {/* Показываем сообщение об успехе/ошибке отправки ПОСЛЕ отправки */}
          {submitSuccess && (
            <p
              className="success-message"
              style={{ textAlign: "center", marginBottom: "15px" }}
            >
              Анкета успешно отправлена!
            </p>
          )}
          {submitError && (
            <p
              className="error-message"
              style={{ textAlign: "center", marginBottom: "15px" }}
            >
              {submitError}
            </p>
          )}

          {/* Скрываем шаги, если анкета уже успешно отправлена */}
          {!submitSuccess && (
            <>
              <div className="step-container">
                {/* Стрелка НАЗАД */}
                {currentStep > 1 && (
                  <button
                    className="step-nav-arrow prev-arrow"
                    onClick={handlePrevStep}
                    disabled={isSubmitting}
                  >
                    ←
                  </button>
                )}
                {/* Заглушка для выравнивания */}
                {currentStep === 1 && <div className="arrow-placeholder"></div>}

                {/* Контент текущего шага */}
                <div className="step-content-wrapper">
                  {currentStep === 1 && (
                    // На шаге 1 используем Outlet, передавая КОНТЕКСТ
                    <div className="sitter-profile-form-step">
                      <Outlet context={outletContextValue} />
                    </div>
                  )}
                  {currentStep === 2 && (
                    <SitterStep2Services
                      data={step2Data}
                      setData={setStep2Data}
                    />
                  )}
                  {currentStep === 3 && (
                    <SitterStep3Details
                      data={step3Data}
                      setData={setStep3Data}
                    />
                  )}
                  {currentStep === 4 && (
                    // Передаем актуальные данные fetchedUserData
                    <SitterStep4Confirmation
                      dataStep1={fetchedUserData}
                      dataStep2={step2Data}
                      dataStep3={step3Data}
                    />
                  )}
                </div>

                {/* Стрелка ВПЕРЕД / Кнопка Отправить */}
                <button
                  className="step-nav-arrow next-arrow"
                  onClick={handleNextStep}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "..."
                    : currentStep === totalSteps
                    ? "✓"
                    : "→"}
                </button>
              </div>

              {/* Индикатор шагов */}
              <div className="step-indicator">
                {[...Array(totalSteps)].map((_, i) => (
                  <span
                    key={i}
                    className={`dot ${currentStep === i + 1 ? "active" : ""}`}
                  ></span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Сообщение для неавторизованных (если форма не показана) */}
      {!isUserLoggedIn && !showForm && !isLoadingProfile && (
        <p className="info-message">
          Пожалуйста, <a href="/login">войдите</a> или{" "}
          <a href="/registration">зарегистрируйтесь</a>, чтобы подать заявку.
        </p>
      )}
    </div>
  );
}
