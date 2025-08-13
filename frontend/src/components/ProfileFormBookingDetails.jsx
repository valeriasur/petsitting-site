import React, { useState, useEffect, useCallback } from "react";
import axios from "axios"; // Импортируем axios
import "./ProfileForm.css";
import { useOutletContext } from "react-router-dom";

export default function ProfileFormBookingDetails() {
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [middle_name, setMiddleName] = useState("");
  const [confidant_first_name, setConfidantFirstName] = useState("");
  const [confidant_last_name, setConfidantLastName] = useState("");
  const [confidant_middle_name, setConfidantMiddleName] = useState("");
  const [confidant_phone, setConfidantPhone] = useState("");

  const [loading, setLoading] = useState(false); // Состояние загрузки
  const [error, setError] = useState(null); // Состояние ошибки
  const [success, setSuccess] = useState(false); // Состояние успеха

  // --- Получение данных и callback из контекста ---
  const context = useOutletContext();
  const initialUserData = context?.userData?.user;
  const onProfileUpdate = context?.onProfileUpdate;

  // // --- ИСПРАВЛЕННЫЕ ПУТИ ---
  // const documentUrl_1 = "/downloads/example_1.pdf"; // Путь относительно папки public
  // const downloadFileName_1 = "Шаблон_договора_передержки.pdf";

  // const documentUrl_2 = "/downloads/example_2.pdf";
  // const downloadFileName_2 = "Шаблон_договора_на_выгул.pdf"; // Изменил имя для соответствия

  // const documentUrl_3 = "/downloads/example_3.pdf";
  // const downloadFileName_3 = "Шаблон_договора_на_услугу_дневной_няни.pdf";
  // --- КОНЕЦ ИСПРАВЛЕННЫХ ПУТЕЙ ---

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setLoading(true);
      setError(null);
      setSuccess(false);
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Токен не найден.");

        const response = await axios.put(
          "http://localhost:5000/api/profile", // Тот же эндпоинт
          {
            // Отправляем все поля, включая новые
            first_name,
            last_name,
            middle_name, // Используем middle_name
            confidant_first_name,
            confidant_last_name,
            confidant_middle_name,
            confidant_phone,
            // Важно: отправляем ТОЛЬКО те поля, которые относятся к этому компоненту
            // Основные данные (телефон, город) обновляются в ProfileForm
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess(true);
        console.log("Данные для договора сохранены:", response.data);
        if (typeof onProfileUpdate === "function" && response.data?.user) {
          // Передаем ВЕСЬ обновленный объект пользователя родителю
          onProfileUpdate(response.data);
        }
      } catch (error) {
        console.error("Ошибка сохранения данных для договора:", error);
        setError(
          error.response?.data?.message ||
            error.message ||
            "Не удалось сохранить данные."
        );
      } finally {
        setLoading(false);
      }
    },
    [
      // Добавляем все состояния формы в зависимости
      first_name,
      last_name,
      middle_name,
      confidant_first_name,
      confidant_last_name,
      confidant_middle_name,
      confidant_phone,
      onProfileUpdate,
    ]
  );

  const handleChange = useCallback((event, setter) => {
    setter(event.target.value);
    setError(null);
    setSuccess(false);
  }, []);

  // --- Эффект для заполнения формы ---
  useEffect(() => {
    if (initialUserData) {
      console.log(
        "BookingDetailsForm: Populating form with user data:",
        initialUserData
      );
      setFirstName(initialUserData.first_name || "");
      setLastName(initialUserData.last_name || "");
      setMiddleName(initialUserData.middle_name || ""); // Используем новое поле
      setConfidantFirstName(initialUserData.confidant_first_name || "");
      setConfidantLastName(initialUserData.confidant_last_name || "");
      setConfidantMiddleName(initialUserData.confidant_middle_name || "");
      setConfidantPhone(initialUserData.confidant_phone || "");
    }
  }, [initialUserData]);

  return (
    <>
      <h3 className="title">
        Данные для формирования договора по вашим заказам
      </h3>
      <p>
        При подтверждении бронирования работником будет сформирован онлайн
        договор.
      </p>
      {/* <div className="download-link">
        <a
          href={process.env.PUBLIC_URL + documentUrl_1}
          download={downloadFileName_1}
        >
          Скачать шаблон договора на передержку (PDF)
        </a>
        <a
          href={process.env.PUBLIC_URL + documentUrl_2}
          download={downloadFileName_2}
        >
          Скачать шаблон договора на выгул (PDF)
        </a>
        <a
          href={process.env.PUBLIC_URL + documentUrl_3}
          download={downloadFileName_3}
        >
          Скачать шаблон договора на услугу дневной няни (PDF)
        </a>
      </div> */}
      <div className="form-section-heading">
        <h3>Ваши личные данные</h3>
      </div>
      <p>
        Для оформления бронирования и формирования договора по услуге,
        необходимо заполнить личные данные.
      </p>
      <div className="form-group">
        <label htmlFor="last_name">Фамилия</label>
        <input
          type="text"
          id="last_name"
          name="last_name"
          value={last_name}
          onChange={(e) => handleChange(e, setLastName)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="first_name">Имя</label>
        <input
          type="text"
          id="first_name"
          name="first_name"
          value={first_name}
          onChange={(e) => handleChange(e, setFirstName)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="middle_name">Отчество</label>
        <input
          type="text"
          id="middle_name"
          name="middle_name"
          value={middle_name}
          onChange={(e) => handleChange(e, setMiddleName)}
        />
      </div>
      <div className="form-section-heading">
        <h3>Ваше доверенное лицо</h3>
      </div>
      <p>
        Укажите доверенное лицо на время вашего отсутствия (обязательно для
        заказа передержки). Этот контакт будет использоваться только в случае
        экстренной ситуации, если вы недоступны.
      </p>
      <div className="form-group">
        <label htmlFor="confidant_last_name">Фамилия</label>
        <input
          type="text"
          id="confidant_last_name"
          name="confidant_last_name"
          value={confidant_last_name}
          onChange={(e) => handleChange(e, setConfidantLastName)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="confidant_first_name">Имя</label>
        <input
          type="text"
          id="confidant_first_name"
          name="confidant_first_name"
          value={confidant_first_name}
          onChange={(e) => handleChange(e, setConfidantFirstName)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="confidant_middle_name">Отчество</label>
        <input
          type="text"
          id="confidant_middle_name"
          name="confidant_middle_name"
          value={confidant_middle_name}
          onChange={(e) => handleChange(e, setConfidantMiddleName)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="confidant_phone">Телефон</label>
        <input
          type="tel"
          id="confidant_phone"
          name="confidant_phone"
          value={confidant_phone}
          placeholder="+7________"
          onChange={(e) => handleChange(e, setConfidantPhone)}
        />
      </div>
      {/* Сообщения и кнопка */}
      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">Данные успешно сохранены!</p>}
      <button className="save-button" onClick={handleSubmit} disabled={loading}>
        {loading ? "Сохранение..." : "Сохранить"}
      </button>
    </>
  );
}
