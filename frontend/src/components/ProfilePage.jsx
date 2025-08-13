// components/ProfilePage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import Sidebar from "./Sidebar"; // Sidebar импортируется здесь
import axios from "axios";
import "./ProfileForm.css";

function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [showActivationSuccess, setShowActivationSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleProfileUpdate = useCallback((updatedUserDataResponse) => {
    console.log(
      "ProfilePage: handleProfileUpdate called with (response object):",
      updatedUserDataResponse
    );
    if (updatedUserDataResponse && updatedUserDataResponse.user) {
      setUserData(updatedUserDataResponse); // Это правильно, обновляем весь объект userData
      console.log(
        "ProfilePage: userData state updated via handleProfileUpdate."
      );
    } else {
      console.warn(
        "ProfilePage: handleProfileUpdate received data not in expected format { user: ... }",
        "Received:",
        updatedUserDataResponse
      );
    }
  }, []); // setUserData стабильна, useCallback здесь уместен

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.log(
            "ProfilePage/fetchProfileData: No token, navigating to login."
          );
          navigate("/login");
          return;
        }
        const response = await axios.get("http://localhost:5000/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        console.log("ProfilePage: Raw profile data from API:", response.data);
        if (response.data && response.data.user) {
          setUserData(response.data);
        } else {
          console.error(
            "ProfilePage: Invalid profile data format received:",
            response.data
          );
        }
      } catch (error) {
        console.error(
          "Ошибка при получении данных профиля в ProfilePage",
          error
        );
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
        }
      }
    };

    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get("activated") === "true") {
      setShowActivationSuccess(true);
      navigate("/profile", { replace: true });
      const timer = setTimeout(() => setShowActivationSuccess(false), 5000);
      return () => clearTimeout(timer);
    }

    // Загружаем данные, только если их нет и это не сценарий активации
    // (сценарий активации обрабатывается выше и выходит из useEffect)
    if (!userData) {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log(
          "ProfilePage/useEffect: No token (initial load check), navigating to login."
        );
        navigate("/login");
        return;
      }
      console.log(
        "ProfilePage: Fetching initial profile data as userData is null."
      );
      fetchProfileData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, location.search, userData]); // userData в зависимостях нужен, чтобы useEffect перезапускался, если userData станет null (например, при логауте и редиректе сюда)
  // и для условия !userData

  // Контекст для компонентов, рендерящихся через Outlet
  const outletContextValue = {
    userData: userData,
    onProfileUpdate: handleProfileUpdate,
  };

  // Показываем лоадер, пока userData не загружен
  // (но не если это сценарий активации, который может не устанавливать userData сразу)
  const queryParams = new URLSearchParams(location.search);
  if (!userData && queryParams.get("activated") !== "true") {
    return <div>Загрузка профиля...</div>;
  }

  return (
    <div className="profile-container">
      {/* Передаем userData и handleProfileUpdate как пропсы в Sidebar */}
      {/* Убедимся, что userData существует перед передачей в Sidebar, чтобы избежать ошибок в Sidebar */}
      {userData && (
        <Sidebar
          passedUserData={userData}
          onProfileUpdatePassed={handleProfileUpdate}
        />
      )}
      <div className="main-content-wrapper">
        {showActivationSuccess && (
          <div className="activation-success-message">
            Профиль успешно подтвержден!
          </div>
        )}
        {/* Передаем контекст в Outlet. Только компоненты, рендерящиеся в Outlet, его получат. */}
        {/* Также рендерим Outlet только если userData есть, чтобы дочерние компоненты не получали null */}
        {userData && <Outlet context={outletContextValue} />}
      </div>
    </div>
  );
}

export default ProfilePage;
