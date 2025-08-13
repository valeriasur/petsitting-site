// components/Sidebar.js
// import { useOutletContext } from "react-router-dom"; // УДАЛЯЕМ ЭТО
import "./ProfileForm.css";
import СustomLink from "./СustomLink";
import React, { useState, useEffect } from "react";
import axios from "axios";
import DefaultAvatarPlaceholderImage from "../images/iconDefaultAccount.png";

const DEFAULT_AVATAR_PLACEHOLDER = DefaultAvatarPlaceholderImage;
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Принимаем пропсы passedUserData и onProfileUpdatePassed
function Sidebar({ passedUserData, onProfileUpdatePassed }) {
  // Используем данные из пропсов
  const userFromContext = passedUserData?.user; // Берем .user из passedUserData
  const onProfileUpdate = onProfileUpdatePassed; // Это уже сама функция

  const [avatarPreview, setAvatarPreview] = useState(
    DEFAULT_AVATAR_PLACEHOLDER
  );
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const serverAvatarPath = userFromContext?.avatarURL;
    console.log(
      "Sidebar EFFECT (PROPS): userFromContext.avatarURL:",
      serverAvatarPath,
      "Current avatarPreview (start):",
      typeof avatarPreview === "string"
        ? avatarPreview.substring(0, 70)
        : avatarPreview
    );

    if (serverAvatarPath && serverAvatarPath.trim() !== "") {
      let fullServerUrl;
      if (
        serverAvatarPath.startsWith("http") ||
        serverAvatarPath.startsWith("blob:")
      ) {
        fullServerUrl = serverAvatarPath;
      } else {
        const correctedPath = serverAvatarPath.startsWith("/")
          ? serverAvatarPath
          : `/${serverAvatarPath}`;
        fullServerUrl = `${API_BASE_URL}${correctedPath}`;
      }

      if (
        avatarPreview !== fullServerUrl &&
        !avatarPreview.startsWith("data:")
      ) {
        console.log(
          `Sidebar EFFECT (PROPS): Setting avatarPreview to server URL: ${fullServerUrl}`
        );
        setAvatarPreview(fullServerUrl);
      } else if (avatarPreview.startsWith("data:")) {
        console.log(
          `Sidebar EFFECT (PROPS): avatarPreview is a local data:URL, not updating from server path (${fullServerUrl}).`
        );
      } else {
        console.log(
          `Sidebar EFFECT (PROPS): avatarPreview already matches server URL or is a local preview. No change.`
        );
      }
    } else {
      if (
        avatarPreview !== DEFAULT_AVATAR_PLACEHOLDER &&
        !avatarPreview.startsWith("data:")
      ) {
        console.log(
          "Sidebar EFFECT (PROPS): No serverAvatarPath, and preview is not placeholder/dataURL. Setting DEFAULT_AVATAR_PLACEHOLDER"
        );
        setAvatarPreview(DEFAULT_AVATAR_PLACEHOLDER);
      } else if (
        !serverAvatarPath &&
        avatarPreview === DEFAULT_AVATAR_PLACEHOLDER
      ) {
        console.log(
          "Sidebar EFFECT (PROPS): No serverAvatarPath, and preview is already placeholder. No change."
        );
      }
    }
  }, [userFromContext?.avatarURL]); // Зависимость от avatarURL из пропсов

  const handleAvatarChange = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      event.target.value = null;
      return;
    }
    setIsUploading(true);

    let previousAvatarSrc = DEFAULT_AVATAR_PLACEHOLDER;
    if (userFromContext?.avatarURL) {
      const prevPath = userFromContext.avatarURL;
      if (prevPath.startsWith("http") || prevPath.startsWith("blob:")) {
        previousAvatarSrc = prevPath;
      } else {
        const correctedPrevPath = prevPath.startsWith("/")
          ? prevPath
          : `/${prevPath}`;
        previousAvatarSrc = `${API_BASE_URL}${correctedPrevPath}`;
      }
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
      console.log(
        "Sidebar (PROPS): Local preview set to data:URL for new avatar."
      );
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert(
          "Ошибка: Токен аутентификации не найден. Пожалуйста, войдите снова."
        );
        setAvatarPreview(previousAvatarSrc);
        setIsUploading(false);
        event.target.value = null;
        return;
      }

      console.log("Sidebar (PROPS): Uploading new avatar...");
      const response = await axios.put(
        `${API_BASE_URL}/api/profile`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log(
        "Sidebar (PROPS): Avatar uploaded, response data:",
        response.data
      );

      if (response.data?.user?.avatarURL) {
        // ВАЖНО: Проверяем, что onProfileUpdate (т.е. onProfileUpdatePassed) является функцией
        if (typeof onProfileUpdate === "function") {
          console.log(
            "Sidebar (PROPS): Calling onProfileUpdate (passed as prop) with new user data."
          );
          onProfileUpdate(response.data); // Вызываем функцию, переданную через пропс
        } else {
          console.warn(
            "Sidebar (PROPS): onProfileUpdate (passed as prop) is not a function or not found. Updating preview locally (fallback)."
          );
          const newPath = response.data.user.avatarURL;
          const correctedNewPath = newPath.startsWith("/")
            ? newPath
            : `/${newPath}`;
          setAvatarPreview(`${API_BASE_URL}${correctedNewPath}`);
        }
        alert("Аватар успешно обновлен!");
      } else {
        console.error(
          "Sidebar (PROPS): AvatarURL not found in server response after upload."
        );
        setAvatarPreview(previousAvatarSrc);
        alert("Ошибка: Сервер не вернул обновленный URL аватара.");
      }
    } catch (error) {
      console.error(
        "Sidebar (PROPS): Error uploading avatar:",
        error.response?.data || error.message
      );
      setAvatarPreview(previousAvatarSrc);
      alert(
        "Ошибка загрузки аватара: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setIsUploading(false);
      event.target.value = null;
    }
  };

  const hasServerAvatar =
    userFromContext?.avatarURL && userFromContext.avatarURL.trim() !== "";
  const buttonText = hasServerAvatar ? "Сменить фото" : "Загрузить фото";

  return (
    <div className="sidebar">
      <ul>
        <СustomLink to="/profile">Основные данные</СustomLink>
        <СustomLink to="/profile/pet">Ваш питомец</СustomLink>
        <СustomLink to="/profile/account">Аккаунт</СustomLink>
        <СustomLink to="/profile/bookingDetails">
          Данные для договора
        </СustomLink>
        <СustomLink to="/profile/my-bookings">Мои Бронирования</СustomLink>
      </ul>
      <div className="avatar-container">
        <img
          src={avatarPreview}
          alt="Аватар"
          className="avatar-image-preview"
          onError={(e) => {
            console.warn(
              "Sidebar Image onError (PROPS): Failed to load image, falling back to placeholder. Faulty src:",
              e.target.src.substring(0, 100)
            );
            e.target.onerror = null;
            if (e.target.src !== DEFAULT_AVATAR_PLACEHOLDER) {
              setAvatarPreview(DEFAULT_AVATAR_PLACEHOLDER);
            }
          }}
        />
      </div>
      <div className="profile-picture-upload">
        <label
          htmlFor="avatar-upload-input"
          className={`upload-button ${
            isUploading ? "upload-button-disabled" : ""
          }`}
        >
          {isUploading ? "Загрузка..." : buttonText}
        </label>
        <input
          type="file"
          id="avatar-upload-input"
          name="avatar"
          accept="image/*"
          onChange={handleAvatarChange}
          style={{ display: "none" }}
          disabled={isUploading}
        />
      </div>
    </div>
  );
}

export default Sidebar;
