// src/components/SitterStep4Confirmation.jsx
import React from "react";
import "./SitterApplicationPage.css"; // Убедитесь, что путь к стилям верный

export default function SitterStep4Confirmation({
  dataStep1, // Данные профиля пользователя (ожидается формат { user: {...} })
  dataStep2, // Данные шага 2 (услуги) (ожидается { services: {...} })
  dataStep3, // Данные шага 3 (детали) (ожидается { details: {...} })
}) {
  // --- Вспомогательные функции для извлечения и форматирования данных ---

  // Получение данных пользователя из dataStep1
  const getUserData = (key) => {
    // Используем snake_case ключи, как в DTO/БД
    return dataStep1?.user?.[key] || "Нет данных";
  };

  // Получение простых данных (строка, число, boolean как Да/Нет) из dataStep3.details
  const getDetailData = (key, defaultValue = "Не указано") => {
    // Читаем по snake_case ключу
    const value = dataStep3?.details?.[key];
    // Обрабатываем null/undefined и пустые строки
    // Для boolean 'Да'/'Нет' возвращаем как есть
    return value !== null && value !== undefined && value !== ""
      ? value
      : defaultValue;
  };

  // Получение и форматирование данных из массивов чекбоксов (размеры, возраст, типы питомцев)
  const getCheckboxData = (key) => {
    const value = dataStep3?.details?.[key]; // Читаем массив по snake_case ключу
    // Проверяем, что это непустой массив
    if (Array.isArray(value) && value.length > 0) {
      return value.join(", "); // Объединяем элементы через запятую
    }
    return "Не указано"; // Возвращаем, если массив пуст или не существует
  };

  // Отображение информации о загруженных файлах
  const getFileData = (fieldKey, multiple = false) => {
    const fileOrFiles = dataStep3?.details?.[fieldKey]; // Получаем файл(ы) из состояния шага 3

    if (!fileOrFiles) {
      return "Не загружено";
    }

    if (multiple) {
      // Для множественных файлов (фото жилья)
      // Убедимся, что это массив и содержит хотя бы один File объект
      if (
        Array.isArray(fileOrFiles) &&
        fileOrFiles.some((f) => f instanceof File)
      ) {
        // Считаем только реальные файлы
        const fileCount = fileOrFiles.filter((f) => f instanceof File).length;
        return fileCount > 0 ? `Загружено ${fileCount} фото` : "Не загружено";
      } else {
        return "Не загружено";
      }
    } else {
      // Для одиночного файла (фото профиля)
      if (fileOrFiles instanceof File) {
        return `Загружено: ${fileOrFiles.name}`;
      } else {
        return "Не загружено";
      }
    }
  };

  // Рендеринг списка выбранных услуг и их цен
  const renderServices = () => {
    const services = dataStep2?.services || {}; // Безопасный доступ к услугам
    const rendered = []; // Массив для JSX элементов услуг

    // Проверяем каждую услугу
    if (services.boarding?.enabled) {
      rendered.push(
        <p key="boarding">
          <strong>Передержка:</strong>{" "}
          {services.boarding.ratePerDay || "Цена не указана"} руб/сутки
          {services.boarding.maxDogs &&
            ` (макс. ${services.boarding.maxDogs} питомцев)`}
        </p>
      );
    }

    if (services.walking?.enabled) {
      rendered.push(
        <p key="walking">
          <strong>Выгул:</strong>{" "}
          {services.walking.ratePer30MinWalk || "Цена не указана"} руб/30мин
        </p>
      );
    }

    if (services.houseSitting?.enabled) {
      rendered.push(
        <p key="houseSitting">
          <strong>Визит няни:</strong>{" "}
          {services.houseSitting.ratePer30MinHouseSit || "Цена не указана"}{" "}
          руб/30мин
        </p>
      );
    }

    // Возвращаем либо список услуг, либо сообщение об их отсутствии
    return rendered.length > 0 ? rendered : <p>Услуги не выбраны.</p>;
  };

  // --- Основная JSX разметка компонента ---
  return (
    <div className="sitter-step-content confirmation-step">
      <h4>Подтверждение анкеты</h4>
      <p className="step-description">
        Пожалуйста, проверьте введенные данные перед отправкой.
      </p>

      {/* --- Секция: Основные данные (из Профиля Пользователя) --- */}
      <div className="confirmation-section">
        <h5>Основные данные</h5>
        {/* Используем getUserData с snake_case ключами */}
        <p>
          <strong>Имя:</strong> {getUserData("first_name")}
        </p>
        <p>
          <strong>Фамилия:</strong> {getUserData("last_name")}
        </p>
        <p>
          <strong>Телефон:</strong> {getUserData("phone")}
        </p>
        <p>
          <strong>Адрес:</strong> {getUserData("address_details")}
        </p>
      </div>

      {/* --- Секция: Выбранные Услуги и Цены (из Шага 2) --- */}
      <div className="confirmation-section">
        <h5>Выбранные услуги и цены</h5>
        {renderServices()}
      </div>

      {/* --- Секция: Детали Объявления (из Шага 3) --- */}
      <div className="confirmation-section">
        <h5>Детали объявления</h5>
        <p>
          <strong>Фото профиля:</strong> {getFileData("profilePhoto")}
        </p>
        <p>
          <strong>Фото жилья:</strong> {getFileData("apartmentPhotos", true)}
        </p>
        <p>
          <strong>Обо мне:</strong> {getDetailData("bio")}
        </p>

        {/* Используем getCheckboxData для отображения массивов */}
        <p>
          <strong>С какими питомцами работаете:</strong>{" "}
          {getCheckboxData("acceptedPetTypes")} {/* <-- ДОБАВЛЕНО */}
        </p>
        <p>
          <strong>Принимаемые размеры питомцев:</strong>{" "}
          {getCheckboxData("accepted_sizes")}
        </p>
        <p>
          <strong>Принимаемый возраст питомцев:</strong>{" "}
          {getCheckboxData("accepted_ages")}
        </p>
        {/* Используем getDetailData для простых полей */}

        <p>
          <strong>Наличие собак дома:</strong> {getDetailData("has_own_dogs")}
        </p>

        <p>
          <strong>Наличие кошек дома:</strong> {getDetailData("has_own_cats")}
        </p>

        {/* Условно отображаем описание других животных */}
        {getDetailData("has_other_pets", "Нет") === "Да" && (
          <p style={{ paddingLeft: "15px", fontSize: "0.9em" }}>
            {" "}
            {/* Небольшой отступ */}
            <i>Другие питомцы: {getDetailData("other_pets_description")}</i>
          </p>
        )}

        <p>
          <strong>Умение давать лекарства:</strong>{" "}
          {getDetailData("can_administer_meds")}
        </p>
        <p>
          <strong>Умение делать инъекции:</strong>{" "}
          {getDetailData("can_give_injections")}
        </p>
        <p>
          <strong>Тип жилья:</strong> {getDetailData("housing_type")}
        </p>
        <p>
          <strong>Дети до 10 лет:</strong>{" "}
          {getDetailData("has_children_under_10")}
        </p>
        <p>
          <strong>Опыт работы (лет):</strong>{" "}
          {getDetailData("experience_years")}
        </p>
        <p>
          <strong>Постоянный присмотр:</strong>{" "}
          {getDetailData("has_constant_supervision")}
        </p>
      </div>

      {/* --- Примечание о подтверждении --- */}
      <p className="confirmation-note">
        Нажимая "Отправить анкету", вы подтверждаете правильность введенных
        данных.
      </p>
    </div>
  );
}
