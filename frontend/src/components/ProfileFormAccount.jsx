import React, { useState, useEffect } from "react";
import axios from "axios";
import "./ProfileForm.css";
import { useOutletContext } from "react-router-dom";

export default function ProfileFormAccount() {
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false); // Состояние загрузки
  const [error, setError] = useState(null); // Состояние ошибки
  const [success, setSuccess] = useState(false); // Состояние успеха

  // Получаем текущий email при монтировании компонента
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/user", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setCurrentEmail(response.data.email);
      } catch (error) {
        console.error("Ошибка при получении данных пользователя:", error);
        setCurrentEmail("Ошибка загрузки");
        // Попробуйте получить email из токена как временное решение
        try {
          const token = localStorage.getItem("token");
          if (token) {
            const payload = JSON.parse(atob(token.split(".")[1]));
            setCurrentEmail(payload.email || "Ошибка загрузки");
          }
        } catch (e) {
          console.error("Не удалось получить email из токена:", e);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleEmailChange = async () => {
    console.log("Отправляемые данные:", { newEmail }); // Добавьте эту строк
    if (!newEmail || newEmail === currentEmail) return;
    try {
      const response = await axios.put(
        "http://localhost:5000/api/change-email",
        { newEmail },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setCurrentEmail(newEmail);
      setNewEmail("");
      alert("Email успешно изменен");
    } catch (error) {
      console.error("Ошибка при изменении email:", error);
      alert(error.response?.data?.message || "Ошибка при изменении email");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("Новый пароль и подтверждение не совпадают");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.put(
        "http://localhost:5000/api/change-password",
        { oldPassword, newPassword },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setSuccess("Пароль успешно изменен!");
    } catch (error) {
      setError(error.response?.data?.message || "Ошибка при изменении пароля");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <>
        <h3 className="h3">Изменение почтового адреса</h3>
        <div className="form-group">
          <label>Текущий email:</label>
          <input
            type="text"
            value={currentEmail || "Загрузка..."}
            readOnly
            className="readonly-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="newEmail">Новый email: </label>
          <input
            type="email"
            id="newEmail"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
        </div>
        <button
          className="save-button-account"
          onClick={handleEmailChange}
          disabled={!newEmail || newEmail === currentEmail}
        >
          {loading ? "Сохранение..." : "Сохранить email"}
        </button>

        <h3 className="h3">Изменение пароля</h3>
        <div className="form-group-change-password">
          <div className="input-column">
            <input
              type="text"
              id="password"
              name="password"
              placeholder="Введите старый пароль"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
            <input
              type="text"
              id="password"
              name="password"
              placeholder="Введите новый пароль"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <input
              type="text"
              id="password"
              name="password"
              placeholder="Подтвердите новый пароль"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </div>

        {error && <p className="error-message">{error}</p>}
        {success && (
          <p className="success-message">Профиль успешно обновлен!</p>
        )}

        <button
          className="save-button-account"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Сохранение..." : "Сохранить пароль"}
        </button>
      </>
    </form>
  );
}
