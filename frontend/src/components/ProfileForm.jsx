// components/ProfileForm.js
import React, { useState, useEffect, useCallback } from "react"; // Добавлен useCallback
import axios from "axios";
import "./ProfileForm.css"; // Убедитесь, что этот файл существует и содержит нужные стили
import { useOutletContext } from "react-router-dom";

// Убираем пропс initialData, т.к. данные всегда приходят из контекста
export default function ProfileForm() {
  // --- Состояния для полей формы ---
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressDetails, setAddressDetails] = useState("");

  // --- Состояния для обратной связи ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // --- Получение данных и callback-функции из контекста ---
  // Ожидаем объект: { userData: { user: {...} }, onProfileUpdate: func }
  const context = useOutletContext();
  // Извлекаем данные пользователя (могут быть null при первой загрузке)
  // ВАЖНО: Проверяем и context, и context.userData перед доступом к user
  const initialUserData = context?.userData?.user;
  // Извлекаем функцию обновления (может быть undefined, если не передана)
  const onProfileUpdate = context?.onProfileUpdate;

  // --- Эффект для заполнения формы при получении данных из контекста ---
  useEffect(() => {
    console.log("ProfileForm useEffect - Received context:", context);

    console.log(
      "ProfileForm useEffect - Initial user data from context:",
      initialUserData
    );

    // Заполняем форму, если initialUserData существует и это объект
    if (initialUserData && typeof initialUserData === "object") {
      console.log("ProfileForm useEffect - Setting form states with data:", {
        first_name: initialUserData.first_name,
        last_name: initialUserData.last_name,
        phone: initialUserData.phone,
        address_details: initialUserData.address_details, // <--- ИСПРАВЛЕНО
      });

      setFirstName(initialUserData.first_name || "");
      setLastName(initialUserData.last_name || "");
      setPhone(initialUserData.phone || "");
      setAddressDetails(initialUserData.address_details || "");

      console.log("ProfileForm useEffect - Setting form states with:", {
        first_name: initialUserData.first_name,
        last_name: initialUserData.last_name,
        phone: initialUserData.phone,
        address_details: initialUserData.address_details,
      });
      // Используем snake_case ключи, как в DTO и БД
      setFirstName(initialUserData.first_name || "");
      setLastName(initialUserData.last_name || "");
      setPhone(initialUserData.phone || "");
      setAddressDetails(initialUserData.address_details || "");
    } else {
      console.log(
        "ProfileForm useEffect - Initial user data not found or invalid."
      );
      setFirstName("");
      setLastName("");
      setPhone("");
      setAddressDetails("");
    }
    // этот useEffect сработает снова и перерисует форму новыми данными.
  }, [initialUserData]); // Зависимость только от данных пользователя

  // --- Обработчик изменения полей ввода ---
  const handleChange = useCallback((event, setter) => {
    setter(event.target.value);
    // Сбрасываем сообщения об ошибке/успехе при изменении
    setError(null);
    setSuccess(false);
  }, []); // useCallback, т.к. функция не зависит от внешних переменных (кроме setter, которые стабильны)

  // --- Обработчик отправки формы ---
  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault(); // Предотвращаем стандартную отправку формы
      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Токен аутентификации не найден.");
        }

        // Отправляем PUT запрос на обновление профиля
        const response = await axios.put(
          "http://localhost:5000/api/profile", // Ваш эндпоинт обновления профиля
          {
            // Отправляем данные в snake_case, как ожидает бэкенд
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            address_details: addressDetails,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`, // Передаем токен для авторизации
            },
          }
        );

        setSuccess(true); // Показываем сообщение об успехе
        console.log("Профиль успешно обновлен на бэкенде:", response.data);

        // Вызываем callback родительского компонента, если он есть,
        // и если бэкенд вернул обновленные данные пользователя
        if (
          typeof onProfileUpdate === "function" &&
          response.data &&
          response.data.user
        ) {
          console.log(
            "ProfileForm: Calling onProfileUpdate with new data:",
            response.data
          );
          // Передаем весь объект ответа { user: {...} }, чтобы родитель обновил свое состояние
          onProfileUpdate(response.data);
        } else {
          console.warn(
            "ProfileForm: onProfileUpdate callback is missing or backend response is not in expected format ({ user: ... }). Parent state might not be updated."
          );
        }
      } catch (error) {
        console.error("Ошибка при обновлении профиля:", error);
        // Обрабатываем ошибки и показываем сообщение пользователю
        if (error.response) {
          // Ошибка от сервера (например, 400, 401, 500)
          setError(
            error.response.data.message || "Произошла ошибка на сервере."
          );
        } else if (error.request) {
          // Запрос был сделан, но ответа не было
          setError("Не удалось связаться с сервером. Проверьте подключение.");
        } else {
          // Другая ошибка (например, ошибка в настройке запроса)
          setError(error.message || "Произошла непредвиденная ошибка.");
        }
      } finally {
        setLoading(false); // Снимаем индикатор загрузки в любом случае
      }
      // Зависимости useCallback: функции состояния и onProfileUpdate
    },
    [firstName, lastName, phone, addressDetails, onProfileUpdate]
  );
  console.log("ProfileForm RENDER. State addressDetails:", addressDetails);

  // Лог для отслеживания значений состояния перед рендером
  console.log(
    "ProfileForm RENDER. State values - firstName:",
    firstName,
    "lastName:",
    lastName,
    "phone:",
    phone,
    "addressDetails:",
    addressDetails
  );

  return (
    <>
      <h2 className="form-title">Основные данные</h2>

      <div className="form-group">
        <label htmlFor="first_name_profile">Имя</label>
        <input
          type="text"
          id="first_name_profile" // Уникальный ID для label
          name="first_name" // Имя поля (для семантики)
          value={firstName} // Привязка к состоянию
          onChange={(e) => handleChange(e, setFirstName)} // Обработчик изменения
          disabled={loading} // Блокируем во время загрузки
        />
      </div>

      <div className="form-group">
        <label htmlFor="last_name_profile">Фамилия</label>
        <input
          type="text"
          id="last_name_profile"
          name="last_name"
          value={lastName}
          onChange={(e) => handleChange(e, setLastName)}
          disabled={loading}
        />
      </div>
      <p className="form-description">
        Необходимо указать реальные фамилию и адрес. Ваши личные данные не будут
        отображаться на Вашей странице на сайте.
      </p>

      <div className="form-group">
        <label htmlFor="phone_profile">Телефон</label>
        <input
          type="tel"
          id="phone_profile"
          name="phone"
          placeholder="+7 (___) ___-__-__" // Можно добавить маску или использовать библиотеку
          value={phone}
          onChange={(e) => handleChange(e, setPhone)}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="address_details_profile">Полный адрес</label>
        <input
          type="text"
          id="address_details_profile"
          name="addressDetails"
          value={addressDetails}
          onChange={(e) => handleChange(e, setAddressDetails)}
          disabled={loading}
        />
      </div>

      {/* Отображение сообщений об ошибке или успехе */}
      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">Профиль успешно обновлен!</p>}

      {/* Кнопка сохранения */}
      {/* Убрал type="submit", используем onClick */}
      <button className="save-button" onClick={handleSubmit} disabled={loading}>
        {loading ? "Сохранение..." : "Сохранить"}
      </button>
    </>
  );
}
