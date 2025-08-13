// src/components/SitterStep3Details.jsx
import React from "react";
import "./SitterApplicationPage.css"; // Убедитесь, что все нужные стили здесь

export default function SitterStep3Details({ data, setData }) {
  // Список типов питомцев (можно получать с бэкенда, если он динамический)
  const AVAILABLE_PET_TYPES = [
    "Кошка",
    "Собака",
    "Хомяк",
    "Декоративная крыса",
    "Шиншилла",
    "Морская свинка",
    "Кролик",
    "Еж",
    "Попугай",
    "Рыбки",
    "Черепаха",
  ];

  // Список возрастов питомцев
  const AVAILABLE_PET_AGES = [
    // Убрали value, так как используем label напрямую для консистентности
    { label: "Молодые (до 1 года)" },
    { label: "Взрослые (1-10 лет)" },
    { label: "Пожилые (10+ лет)" },
  ];

  // Обработчик для простых полей (текст, число)
  const handleValueChange = (field, value) => {
    setData((prev) => ({
      ...prev,
      details: { ...(prev.details || {}), [field]: value },
    }));
  };

  // Обработчик для Да/Нет радио-кнопок
  const handleYesNoRadioChange = (field, value) => {
    handleValueChange(field, value);

    // Если для 'has_other_pets' выбрано "Нет", очищаем 'other_pets_description'
    if (field === "has_other_pets" && value === "Нет") {
      handleValueChange("other_pets_description", ""); // Очищаем описание
    }
  };

  // Обработчик для чекбоксов (типы, размеры, возраст)
  const handleCheckboxGroupChange = (field, value) => {
    setData((prev) => {
      const currentValues = Array.isArray(prev.details?.[field])
        ? prev.details[field]
        : [];
      let newValues;
      if (currentValues.includes(value)) {
        newValues = currentValues.filter((item) => item !== value);
      } else {
        newValues = [...currentValues, value];
      }
      return {
        ...prev,
        details: { ...(prev.details || {}), [field]: newValues },
      };
    });
  };

  // Обработчик для файлов
  const handleFileChange = (field, files) => {
    const value =
      field === "profilePhoto" && files.length > 0
        ? files[0]
        : Array.from(files);
    setData((prev) => ({
      ...prev,
      details: { ...(prev.details || {}), [field]: value },
    }));
  };

  // Безопасный доступ к данным state
  const getDetail = (key, defaultValue = "") =>
    data?.details?.[key] ?? defaultValue;
  const getArrayDetail = (key) => data?.details?.[key] || [];
  const getFileDetail = (key) => data?.details?.[key];

  // Определяем, нужно ли показывать поле описания других животных
  const showOtherPetsDescription = getDetail("has_other_pets") === "Да";

  return (
    <div className="sitter-step-content">
      <h4>Детали объявления</h4>
      <p className="step-description">
        Заполните подробную информацию для вашего профиля помощника.
      </p>

      {/* === Фотографии === */}
      <div className="form-group">
        <label htmlFor="profilePhotoInput">Фото профиля</label>
        <div
          style={{
            gridColumn: "2 / 3",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <input
            type="file"
            id="profilePhotoInput"
            name="profilePhoto"
            accept="image/*"
            onChange={(e) => handleFileChange("profilePhoto", e.target.files)}
            style={{ marginBottom: "5px" }}
          />
          {getFileDetail("profilePhoto") instanceof File && (
            <small className="file-preview">
              Выбрано: {getFileDetail("profilePhoto").name}
            </small>
          )}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="apartmentPhotosInput">Фото жилья (до 5 шт.)</label>
        <div
          style={{
            gridColumn: "2 / 3",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <input
            type="file"
            id="apartmentPhotosInput"
            name="apartmentPhotos"
            accept="image/*"
            multiple
            onChange={(e) =>
              handleFileChange("apartmentPhotos", e.target.files)
            }
            style={{ marginBottom: "5px" }}
          />
          {Array.isArray(getFileDetail("apartmentPhotos")) &&
            getFileDetail("apartmentPhotos").length > 0 && (
              <ul className="file-preview-list">
                {getFileDetail("apartmentPhotos").map((file, index) =>
                  file instanceof File ? <li key={index}>{file.name}</li> : null
                )}
              </ul>
            )}
          <small
            className="form-description"
            style={{ textAlign: "left", display: "block", marginTop: "5px" }}
          >
            Покажите место, где будет находиться питомец.
          </small>
        </div>
      </div>

      {/* === Текстовые поля === */}
      <div className="form-group">
        <label htmlFor="sitterBio">Текст "Обо мне"</label>
        <div style={{ gridColumn: "2 / 3" }}>
          <textarea
            id="sitterBio"
            name="bio"
            rows="5"
            value={getDetail("bio")}
            onChange={(e) => handleValueChange("bio", e.target.value)}
            style={{ width: "100%", boxSizing: "border-box" }}
          />
          <small
            className="form-description"
            style={{ textAlign: "left", display: "block", marginTop: "5px" }}
          >
            Минимум один абзац.
          </small>
        </div>
      </div>

      {/* --- Принимаемые типы питомцев --- */}
      <div className="form-group">
        <label>С какими питомцами вы готовы работать?</label>
        <div className="checkbox-group">
          {AVAILABLE_PET_TYPES.map((petType) => (
            <label key={petType}>
              <input
                type="checkbox"
                name="acceptedPetTypes" // Используем ключ 'acceptedPetTypes'
                value={petType}
                checked={getArrayDetail("acceptedPetTypes").includes(petType)}
                onChange={() =>
                  handleCheckboxGroupChange("acceptedPetTypes", petType)
                }
              />{" "}
              {petType}
            </label>
          ))}
        </div>
      </div>

      {/* --- Принимаемые размеры питомцев --- */}
      <div className="form-group">
        <label>Питомцев какого размера вы берете?</label>
        <div className="checkbox-group">
          {[
            "Мини",
            "Малый",
            "Средний",
            "Большой",
            "Очень большой",
            "Любой",
          ].map((size) => (
            <label key={size}>
              <input
                type="checkbox"
                name="accepted_sizes"
                value={size}
                checked={getArrayDetail("accepted_sizes").includes(size)}
                onChange={() =>
                  handleCheckboxGroupChange("accepted_sizes", size)
                }
              />{" "}
              {/* Добавляем пробел */}
              {size === "Мини"
                ? "Мини (до 5 кг)"
                : size === "Малый"
                ? "Малый (5-10 кг)"
                : size === "Средний"
                ? "Средний (10-20 кг)"
                : size === "Большой"
                ? "Большой (20-40 кг)"
                : size === "Очень большой"
                ? "Очень большой (40+ кг)"
                : size}
            </label>
          ))}
        </div>
      </div>

      {/* --- Принимаемый возраст питомцев --- */}
      <div className="form-group">
        <label>Питомцев какого возраста вы берете?</label>
        <div className="checkbox-group">
          {AVAILABLE_PET_AGES.map((ageOption) => (
            <label key={ageOption.label}>
              {" "}
              {/* Используем label как key */}
              <input
                type="checkbox"
                name="accepted_ages"
                // ВАЖНО: Сохраняем label в состоянии, т.к. value теперь нет
                value={ageOption.label}
                checked={getArrayDetail("accepted_ages").includes(
                  ageOption.label
                )}
                onChange={() =>
                  handleCheckboxGroupChange("accepted_ages", ageOption.label)
                }
              />{" "}
              {ageOption.label}
            </label>
          ))}
        </div>
      </div>

      {/* === ИНФОРМАЦИЯ О СОБСТВЕННЫХ ЖИВОТНЫХ СИТТЕРА === */}
      <div className="form-group">
        <label>Есть ли у вас собаки дома?</label>
        <div className="radio-group-inline">
          <label>
            <input
              type="radio"
              name="has_own_dogs"
              value="Да"
              checked={getDetail("has_own_dogs") === "Да"}
              onChange={(e) =>
                handleYesNoRadioChange("has_own_dogs", e.target.value)
              }
            />{" "}
            Да
          </label>
          <label>
            <input
              type="radio"
              name="has_own_dogs"
              value="Нет"
              checked={getDetail("has_own_dogs") === "Нет"}
              onChange={(e) =>
                handleYesNoRadioChange("has_own_dogs", e.target.value)
              }
            />{" "}
            Нет
          </label>
        </div>
      </div>
      <div className="form-group">
        <label>Есть ли у вас кошки дома?</label>
        <div className="radio-group-inline">
          <label>
            <input
              type="radio"
              name="has_own_cats"
              value="Да"
              checked={getDetail("has_own_cats") === "Да"}
              onChange={(e) =>
                handleYesNoRadioChange("has_own_cats", e.target.value)
              }
            />{" "}
            Да
          </label>
          <label>
            <input
              type="radio"
              name="has_own_cats"
              value="Нет"
              checked={getDetail("has_own_cats") === "Нет"}
              onChange={(e) =>
                handleYesNoRadioChange("has_own_cats", e.target.value)
              }
            />{" "}
            Нет
          </label>
        </div>
      </div>
      <div className="form-group">
        <label>Есть ли у вас другие животные дома?</label>
        <div className="radio-group-inline">
          <label>
            <input
              type="radio"
              name="has_other_pets"
              value="Да"
              checked={getDetail("has_other_pets") === "Да"}
              onChange={(e) =>
                handleYesNoRadioChange("has_other_pets", e.target.value)
              }
            />{" "}
            Да
          </label>
          <label>
            <input
              type="radio"
              name="has_other_pets"
              value="Нет"
              checked={getDetail("has_other_pets") === "Нет"}
              onChange={(e) =>
                handleYesNoRadioChange("has_other_pets", e.target.value)
              }
            />{" "}
            Нет
          </label>
        </div>
      </div>

      {/* --- УСЛОВНОЕ ПОЛЕ ДЛЯ ОПИСАНИЯ ДРУГИХ ЖИВОТНЫХ --- */}
      {showOtherPetsDescription && (
        <div className="form-group">
          <label htmlFor="other_pets_description">
            Перечислите других питомцев:
          </label>
          <div style={{ gridColumn: "2 / 3" }}>
            <textarea
              id="other_pets_description"
              name="other_pets_description" // Имя для отправки на бэкенд
              rows="3"
              value={getDetail("other_pets_description")} // Читаем из состояния
              onChange={(e) =>
                handleValueChange("other_pets_description", e.target.value)
              } // Обновляем состояние
              style={{ width: "100%", boxSizing: "border-box" }}
              placeholder="Например: хомяк, попугай"
            />
          </div>
        </div>
      )}
      {/* --- КОНЕЦ УСЛОВНОГО ПОЛЯ --- */}

      {/* === Остальные поля (лекарства, инъекции, жилье, дети, опыт, присмотр) === */}
      <div className="form-group">
        <label>Умеете ли вы давать лекарства?</label>
        <div className="radio-group-inline">
          <label>
            <input
              type="radio"
              name="can_administer_meds"
              value="Да"
              checked={getDetail("can_administer_meds") === "Да"}
              onChange={(e) =>
                handleYesNoRadioChange("can_administer_meds", e.target.value)
              }
            />{" "}
            Да
          </label>
          <label>
            <input
              type="radio"
              name="can_administer_meds"
              value="Нет"
              checked={getDetail("can_administer_meds") === "Нет"}
              onChange={(e) =>
                handleYesNoRadioChange("can_administer_meds", e.target.value)
              }
            />{" "}
            Нет
          </label>
        </div>
      </div>
      <div className="form-group">
        <label>Умеете ли вы делать инъекции?</label>
        <div className="radio-group-inline">
          <label>
            <input
              type="radio"
              name="can_give_injections"
              value="Да"
              checked={getDetail("can_give_injections") === "Да"}
              onChange={(e) =>
                handleYesNoRadioChange("can_give_injections", e.target.value)
              }
            />{" "}
            Да
          </label>
          <label>
            <input
              type="radio"
              name="can_give_injections"
              value="Нет"
              checked={getDetail("can_give_injections") === "Нет"}
              onChange={(e) =>
                handleYesNoRadioChange("can_give_injections", e.target.value)
              }
            />{" "}
            Нет
          </label>
        </div>
      </div>
      <div className="form-group">
        <label>Тип жилья</label>
        <div className="radio-group-inline">
          <label>
            <input
              type="radio"
              name="housing_type"
              value="Квартира"
              checked={getDetail("housing_type") === "Квартира"}
              onChange={(e) =>
                handleYesNoRadioChange("housing_type", e.target.value)
              }
            />{" "}
            Квартира
          </label>
          <label>
            <input
              type="radio"
              name="housing_type"
              value="Апартаменты"
              checked={getDetail("housing_type") === "Апартаменты"}
              onChange={(e) =>
                handleYesNoRadioChange("housing_type", e.target.value)
              }
            />{" "}
            Апартаменты
          </label>
          <label>
            <input
              type="radio"
              name="housing_type"
              value="Дом"
              checked={getDetail("housing_type") === "Дом"}
              onChange={(e) =>
                handleYesNoRadioChange("housing_type", e.target.value)
              }
            />{" "}
            Дом
          </label>
        </div>
      </div>
      <div className="form-group">
        <label>Есть ли у вас дети до 10 лет?</label>
        <div className="radio-group-inline">
          <label>
            <input
              type="radio"
              name="has_children_under_10"
              value="Да"
              checked={getDetail("has_children_under_10") === "Да"}
              onChange={(e) =>
                handleYesNoRadioChange("has_children_under_10", e.target.value)
              }
            />{" "}
            Да
          </label>
          <label>
            <input
              type="radio"
              name="has_children_under_10"
              value="Нет"
              checked={getDetail("has_children_under_10") === "Нет"}
              onChange={(e) =>
                handleYesNoRadioChange("has_children_under_10", e.target.value)
              }
            />{" "}
            Нет
          </label>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="experience_years">Опыт работы (лет)</label>
        <input
          type="number"
          id="experience_years"
          name="experience_years"
          min="0"
          value={getDetail("experience_years")}
          onChange={(e) =>
            handleValueChange("experience_years", e.target.value)
          }
          style={{ width: "100px" }}
        />
      </div>

      <div className="form-group">
        {" "}
        {/* Это form-group для "Постоянный присмотр?" */}
        <label>Постоянный присмотр?</label>
        {/* Только радио-кнопки остаются во второй колонке */}
        <div
          className="radio-group-inline"
          style={{
            gridColumn: "2 / 3" /* , alignItems: "center" если нужно */,
          }}
        >
          <label>
            <input
              type="radio"
              name="has_constant_supervision"
              value="Да"
              checked={getDetail("has_constant_supervision") === "Да"}
              onChange={(e) =>
                handleYesNoRadioChange(
                  "has_constant_supervision",
                  e.target.value
                )
              }
            />{" "}
            Да
          </label>
          <label>
            <input
              type="radio"
              name="has_constant_supervision"
              value="Нет"
              checked={getDetail("has_constant_supervision") === "Нет"}
              onChange={(e) =>
                handleYesNoRadioChange(
                  "has_constant_supervision",
                  e.target.value
                )
              }
            />{" "}
            Нет
          </label>
        </div>
        {/* Инфо-блок теперь здесь, ПОСЛЕ radio-group-inline, но ВНУТРИ form-group */}
        {/* Он будет занимать всю ширину, доступную ПОД меткой и радио-кнопками, если не указать grid-column */}
        {/* Чтобы он начинался с левого края (как метки), ему нужно указать grid-column: 1 / -1 */}
        <div
          className="commission-info" // или ваш кастомный класс form-group-fullwidth-info
          style={{
            gridColumn: "1 / -1", // <-- ЗАСТАВЛЯЕМ ЗАНИМАТЬ ВСЕ КОЛОНКИ
            // marginLeft: "165px", //  <-- Примерный отступ, если хотите начать его ПОСЛЕ места для метки
            // Этот отступ нужно будет подобрать.
            // Если хотите начать с самого левого края, то marginLeft: 0 (или убрать)
            marginTop: "10px", // Отступ сверху от радио-кнопок
            // width: "auto",     // Пусть ширина определяется гридом
            boxSizing: "border-box",
          }}
        >
          Постоянный присмотр за питомцем означает постоянное нахождение дома.
        </div>
      </div>
    </div>
  );
}
