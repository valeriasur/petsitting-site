import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import "./App.css";
import Header from "./components/Header";
import SearchPage from "./components/SearchPage.jsx";
import LoginForm from "./components/LoginForm.jsx";
import ProfilePage from "./components/ProfilePage.jsx";
import HomePage from "./components/HomePage.jsx";
import { useState, useEffect } from "react";
import ProfileForm from "./components/ProfileForm";
import ProfileFormPet from "./components/ProfileFormPet";
import ProfileFormAccount from "./components/ProfileFormAccount.jsx";
import ProfileFormBookingDetails from "./components/ProfileFormBookingDetails.jsx";
import SitterApplicationPage from "./components/SitterApplicationPage.jsx";
import SitterProfilePage from "./components/SitterProfilePage";
import MyBookingsPage from "./components/MyBookingsPage";
import ServicesPage from "./components/ServicesPage.jsx";
import React, { useCallback } from "react";
import ReviewsPage from "./components/ReviewsPage.jsx";

import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true); // Состояние для индикации проверки авторизации

  // Функция для проверки текущей сессии
  const checkAuthStatus = useCallback(async (isInitialLoad = false) => {
    if (!isInitialLoad) setLoadingAuth(true);
    const accessToken = localStorage.getItem("token");

    if (!accessToken) {
      setIsLoggedIn(false);
      setLoadingAuth(false);
      return false;
    }

    try {
      await axios.get(`${API_BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true, // чтобы httpOnly refreshToken cookie отправился
      });
      setIsLoggedIn(true);
      return true;
    } catch (error) {
      console.error(
        "Auth check failed or token expired:",
        error.response?.data || error.message
      );
      // Если пришел 401, это означает, что accessToken невалиден.
      localStorage.removeItem("token"); // Удаляем невалидный токен
      setIsLoggedIn(false);
      return false;
    } finally {
      setLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus(true); // Проверяем авторизацию при первой загрузке приложения
  }, [checkAuthStatus]);

  const handleLoginSuccess = (accessToken) => {
    localStorage.setItem("token", accessToken);
    setIsLoggedIn(true);
  };

  const handleLogout = useCallback(async () => {
    const accessToken = localStorage.getItem("token");
    try {
      // Уведомляем бэкенд о выходе, он удалит refreshToken из БД и очистит cookie
      if (accessToken) {
        // Отправляем запрос на выход только если есть токен
        await axios.post(
          `${API_BASE_URL}/logout`,
          {},
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            withCredentials: true,
          }
        );
      }
      console.log("Logout successful on backend (or no token to logout).");
    } catch (error) {
      console.error(
        "Error during backend logout:",
        error.response?.data || error.message
      );
    }
    localStorage.removeItem("token");

    setIsLoggedIn(false);
  }, []);

  const updateLoginStateAndRecheck = (loggedIn) => {
    setIsLoggedIn(loggedIn);
    if (!loggedIn) {
      localStorage.removeItem("token");
      handleLogout();
    }
  };

  if (loadingAuth) {
    return <div>Проверка авторизации...</div>;
  }

  return (
    <Router>
      <div className="App">
        <img
          src="header_icon.png"
          alt="Header image"
          className="Header-image"
        />
        <Header isLoggedIn={isLoggedIn} handleLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/registration"
            element={
              <LoginForm isLogin={false} setIsLoggedIn={handleLoginSuccess} />
            }
          />
          <Route
            path="/login"
            element={
              <LoginForm isLogin={true} setIsLoggedIn={handleLoginSuccess} />
            }
          />
          <Route path="/searchPage" element={<SearchPage />} />

          <Route path="/services" element={<ServicesPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />

          <Route path="/sitter/:userId" element={<SitterProfilePage />} />

          {/* <Route path="/becomeSitter" element={<SitterApplicationPage />} /> */}
          <Route path="/becomeSitter" element={<SitterApplicationPage />}>
            <Route index element={<ProfileForm />} />
          </Route>

          {/* Защищенный роут */}
          <Route
            path="/profile/*"
            element={
              isLoggedIn ? <ProfilePage /> : <Navigate to="/login" replace />
            }
          >
            {/* Вложенные роуты для ProfilePage будут отрендерены через <Outlet /> в ProfilePage */}
            <Route index element={<ProfileForm />} />
            <Route path="pet" element={<ProfileFormPet />} />
            <Route path="account" element={<ProfileFormAccount />} />
            <Route
              path="bookingDetails"
              element={<ProfileFormBookingDetails />}
            />
            <Route path="my-bookings" element={<MyBookingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}
