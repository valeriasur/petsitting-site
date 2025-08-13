import React, { useState } from "react";
import "./LoginForm.css";
import axios from "axios";

import { Link, useNavigate } from "react-router-dom";

function LoginForm({ isLogin, setIsLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isLogin && password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    try {
      const url = isLogin
        ? "http://localhost:5000/api/login"
        : "http://localhost:5000/api/registration";

      const response = await axios.post(url, { email, password });

      if (isLogin) {
        if (response.data?.accessToken) {
          setIsLoggedIn(response.data.accessToken); // Передаем токен в App.js

          navigate("/profile");
        } else {
          setError(
            response.data?.message || "Неверное имя пользователя или пароль"
          );
        }
      } else {
        if (response.data?.message) {
          alert(response.data.message);
          navigate("/login");
        } else {
          setError("Ошибка регистрации: неверный ответ сервера");
        }
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "Ошибка сервера";
      setError(errorMessage);
      console.error("Ошибка:", err.response?.data || err.message);
    }
  };

  return (
    <div className="login-form">
      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Почта пользователя:</label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            name="email"
          />
        </div>
        <div>
          <label>Пароль:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            name="password"
          />
        </div>

        {!isLogin && (
          <div>
            <label>Подтверждение пароля:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        )}

        <button type="submit">
          {isLogin ? "Войти" : "Зарегистрироваться"}
        </button>
      </form>

      {isLogin ? (
        <Link to="/registration" style={{ display: "block" }}>
          Нет аккаунта?
        </Link>
      ) : (
        <Link to="/login" style={{ display: "block" }}>
          Уже есть аккаунт? Войти
        </Link>
      )}
    </div>
  );
}

export default LoginForm;
