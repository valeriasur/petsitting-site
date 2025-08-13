// src/components/FilterPanel.js
import React, { useRef, useEffect, useCallback } from "react"; // Добавлен useCallback
import "./SearchPage.css"; // Убедитесь, что путь к стилям верный

function FilterPanel({
  filters, // Текущие значения фильтров из SearchPage
  onFilterChange, // Функция для обновления фильтров в SearchPage
  isAdvancedSearchVisible, // Показать/скрыть расширенные фильтры
  toggleAdvancedSearch, // Функция для переключения видимости
  onResetFilters, // Функция для сброса фильтров
  maxPriceValue, // Максимальное значение для слайдера цены
}) {
  const rangeInputRef = useRef(null);

  const handleSortChange = (e) => {
    const { name, value } = e.target;
    onFilterChange({ [name]: value });
  };

  const handleRatingChange = (newRating) => {
    // Если кликнули по той же звезде, сбрасываем фильтр по рейтингу
    onFilterChange({
      minRating: filters.minRating === newRating ? null : newRating,
    });
  };

  // Эффект для стилизации слайдера цены
  useEffect(() => {
    const input = rangeInputRef.current;
    if (input) {
      const min = parseInt(input.min, 10);
      const max = parseInt(input.max, 10);
      const val = parseInt(filters.maxPrice, 10);
      const percentage = max === min ? 0 : ((val - min) * 100) / (max - min);
      input.style.setProperty("--value-percent", `${percentage}%`);
    }
  }, [filters.maxPrice]);

  // --- Обработчики Изменений (Обновленные) ---

  // Для простых инпутов (text, date, range)
  const handleInputChange = useCallback(
    (event) => {
      const { name, value, type } = event.target;
      const processedValue = type === "range" ? parseInt(value, 10) : value;
      onFilterChange({ [name]: processedValue });
    },
    [onFilterChange]
  );

  // Для одиночных булевых чекбоксов (Нет собак, Нет кошек и т.д.)
  const handleBooleanCheckboxChange = useCallback(
    (event) => {
      const { name, checked } = event.target; // name='sitterHasNoDogs', checked=true/false
      onFilterChange({ [name]: checked });
    },
    [onFilterChange]
  );

  // Для группы чекбоксов, где значение - массив строк (размеры, типы жилья)
  const handleArrayCheckboxChange = useCallback(
    (event) => {
      const { name, value, checked } = event.target;
      const currentValues = filters[name] || [];
      let newValues;
      if (checked) {
        newValues = [...currentValues, value];
      } else {
        newValues = currentValues.filter((item) => item !== value);
      }
      console.log(`FilterPanel: Setting ${name} to:`, newValues); // <-- ЛОГ
      onFilterChange({ [name]: newValues });
    },
    [filters, onFilterChange]
  );

  // Для группы кнопок/радио, где выбирается одно значение (возраст питомца, тип услуги)
  const handleSingleValueChange = useCallback(
    (name, value) => {
      const newValue = filters[name] === value ? null : value; // Сброс при повторном клике
      onFilterChange({ [name]: newValue });
    },
    [filters, onFilterChange]
  );

  return (
    <div className="filter-panel">
      {/* --- Основные фильтры --- */}
      <div className="main-filters-grid">
        {/* Локация */}
        <div className="filter-group filter-group-location">
          <label htmlFor="location" className="filter-label">
            Где искать?
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={filters.location}
            onChange={handleInputChange}
            placeholder="Город"
            className="filter-input filter-input-location"
          />
        </div>

        {/* Тип услуги */}
        <div className="filter-group filter-group-service">
          <label className="filter-label">Тип услуги</label>
          {[
            { key: "boarding", label: "Передержка" },
            { key: "houseSitting", label: "Дневная няня" },
            { key: "walking", label: "Выгул" },
          ].map((service) => (
            <button
              key={service.key}
              onClick={() =>
                handleSingleValueChange("serviceType", service.key)
              } // <-- Передаем key ('boarding')
              className={`filter-button filter-button-service ${
                filters.serviceType === service.key ? "active" : "" // <-- Сравниваем с key ('boarding')
              }`}
            >
              {service.label} {/* <-- Отображаем label ('Передержка') */}
            </button>
          ))}
        </div>

        {/* Даты */}
        <div className="filter-group filter-group-dates">
          <label className="filter-label">
            {filters.serviceType === "boarding"
              ? "Даты передержки"
              : "Выберите дату(ы)"}
          </label>
          <div className="filter-dates-inputs">
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleInputChange}
              className="filter-input filter-input-date"
            />
            <span className="filter-dates-separator">→</span>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleInputChange}
              className="filter-input filter-input-date"
            />
          </div>
          {/* --- Подсказка для услуг с почасовой оплатой --- */}
          {(filters.serviceType === "walking" ||
            filters.serviceType === "houseSitting") &&
            filters.startDate && (
              <div
                style={{
                  gridColumn: "span 1",
                  marginTop: "20px",
                  paddingLeft: "5px",
                }}
              >
                <p style={{ color: "#666", fontSize: "0.85em", margin: 0 }}>
                  Точное свободное время можно будет выбрать в профиле
                  работника.
                </p>
              </div>
            )}
        </div>

        {/* Размер питомца */}
        <div className="filter-group filter-group-dogsize">
          <label className="filter-label">Размер моего питомца</label>
          <div className="filter-options-group filter-options-dogsize">
            {/* Используем значения 'Мини', 'Малый' и т.д. */}
            {[
              { value: "Мини", label: "Мини (до 5 кг)" },
              { value: "Малый", label: "Малый (5 - 10 кг)" },
              { value: "Средний", label: "Средний (10 - 20 кг)" },
              { value: "Большой", label: "Большой (20 - 40 кг)" },
              { value: "Очень большой", label: "Огромный (40 и более кг)" },
              // { value: "Любой", label: "Любой" } // Если ситтеры могут выбрать "Любой"
            ].map((size) => (
              <label
                key={size.value}
                className={`filter-option-label filter-option-dogsize ${
                  (filters.petSizes || []).includes(size.value) ? "active" : ""
                }`}
              >
                <input
                  type="checkbox"
                  name="petSizes"
                  value={size.value}
                  checked={(filters.petSizes || []).includes(size.value)}
                  onChange={handleArrayCheckboxChange}
                  className="filter-option-checkbox-hidden"
                />
                {size.label}
              </label>
            ))}
          </div>
        </div>

        {/* Цена */}
        <div className="filter-group filter-group-price">
          <label htmlFor="maxPrice" className="filter-label">
            Максимальная стоимость за сутки
          </label>
          <input
            ref={rangeInputRef}
            type="range"
            id="maxPrice"
            name="maxPrice"
            min="0"
            max={maxPriceValue}
            step="50"
            value={filters.maxPrice}
            onChange={handleInputChange}
            className="filter-input filter-input-range"
          />
          <span className="filter-price-display">
            {filters.maxPrice >= maxPriceValue
              ? `Любая`
              : `до ${filters.maxPrice} ₽`}
          </span>
        </div>
      </div>
      {/* <--- ИЗМЕНЕНИЯ */}
      <div className="sort-and-rating-controls-container">
        {" "}
        {/* <--- Общий контейнер */}
        {/* Блок для сортировки */}
        <div className="filter-group sort-filter-group">
          {" "}
          {/* Класс для отступов и flex-item */}
          <label htmlFor="sortBySelect">Сортировать по:</label>
          <select
            id="sortBySelect"
            name="sortBy"
            className="sort-by-select"
            value={filters.sortBy || "default"}
            onChange={handleSortChange}
          >
            <option value="default">По умолчанию</option>
            <option value="price_asc">Цене (сначала дешевые)</option>
            <option value="price_desc">Цене (сначала дорогие)</option>
            <option value="rating_desc">Рейтингу (сначала высокие)</option>
          </select>
        </div>
        {/* Блок для фильтрации по рейтингу (пример со звездами) */}
        {/* Показываем его всегда или по isAdvancedSearchVisible, как вам нужно */}
        <div className="filter-group rating-filter-group">
          {" "}
          {/* Класс для отступов и flex-item */}
          <label>Минимальный рейтинг:</label>
          <div className="star-rating-filter">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`star ${
                  filters.minRating && star <= filters.minRating ? "filled" : ""
                }`}
                onClick={() => handleRatingChange(star)}
              >
                ★
              </span>
            ))}
            {filters.minRating && (
              <button
                onClick={() => handleRatingChange(null)}
                className="filter-button filter-button-reset"
              >
                Сбросить
              </button>
            )}
          </div>
        </div>
      </div>{" "}
      {/* <--- Конец общего контейнера */}
      {/* --- Кнопки управления --- */}
      <div className="filter-controls">
        <button
          onClick={onResetFilters}
          className="filter-button filter-button-reset"
        >
          Сбросить фильтр
        </button>
        <button
          onClick={toggleAdvancedSearch}
          className="filter-button filter-button-toggle"
        >
          {isAdvancedSearchVisible ? "Свернуть поиск ▲" : "Расширенный поиск ▼"}
        </button>
      </div>
      {/* --- Расширенные фильтры --- */}
      {isAdvancedSearchVisible && (
        <div className="advanced-filters">
          {/* Возраст питомца */}
          <div className="filter-group filter-group-petage">
            <label className="filter-label">Возраст моего питомца</label>
            <div className="filter-options-group">
              {[
                { value: "Молодые", label: "Молодой (до 1 года)" },
                { value: "Взрослые", label: "Взрослый (1-10 лет)" },
                { value: "Пожилые", label: "Пожилой (10+ лет)" },
              ].map((age) => (
                <button
                  key={age.value}
                  onClick={() =>
                    handleSingleValueChange("petAgeCategory", age.value)
                  }
                  className={`filter-button filter-button-petage ${
                    filters.petAgeCategory === age.value ? "active" : ""
                  }`}
                >
                  {age.label}
                </button>
              ))}
            </div>
          </div>

          {/* Животные ситтера */}
          <div className="filter-group filter-group-sitteranimals">
            <label className="filter-label">Животные ситтера</label>
            {/* Используем плоскую структуру и handleBooleanCheckboxChange */}
            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                name="sitterHasNoDogs"
                checked={!!filters.sitterHasNoDogs}
                onChange={handleBooleanCheckboxChange}
              />{" "}
              Нет собак
            </label>
            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                name="sitterHasNoCats"
                checked={!!filters.sitterHasNoCats}
                onChange={handleBooleanCheckboxChange}
              />{" "}
              Нет кошек
            </label>
            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                name="sitterHasNoOtherPets"
                checked={!!filters.sitterHasNoOtherPets}
                onChange={handleBooleanCheckboxChange}
              />{" "}
              Нет других животных
            </label>
          </div>

          {/* Специальные пожелания */}
          <div className="filter-group filter-group-specialwishes">
            <label className="filter-label">Специальные пожелания</label>
            {/* Используем плоскую структуру и handleBooleanCheckboxChange */}
            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                name="sitterCanGiveMeds"
                checked={!!filters.sitterCanGiveMeds}
                onChange={handleBooleanCheckboxChange}
              />{" "}
              Умеет давать лекарства
            </label>
            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                name="sitterCanInject"
                checked={!!filters.sitterCanInject}
                onChange={handleBooleanCheckboxChange}
              />{" "}
              Умеет делать инъекции
            </label>
            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                name="sitterHasNoKids"
                checked={!!filters.sitterHasNoKids}
                onChange={handleBooleanCheckboxChange}
              />{" "}
              В доме нет детей до 10 лет
            </label>
            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                name="sitterHasConstantSupervision"
                checked={!!filters.sitterHasConstantSupervision}
                onChange={handleBooleanCheckboxChange}
              />{" "}
              Постоянный присмотр
            </label>
            {/* Добавьте usesSecureLeash если нужно */}
          </div>

          {/* Тип жилья ситтера */}
          <div className="filter-group filter-group-housing">
            <label className="filter-label">Тип жилья ситтера</label>
            {/* Используем массив строк и handleArrayCheckboxChange */}
            {["Квартира", "Апартаменты", "Дом"].map((type) => (
              <label key={type} className="filter-checkbox-label">
                <input
                  type="checkbox"
                  name="housingTypes"
                  value={type}
                  checked={(filters.housingTypes || []).includes(type)}
                  onChange={handleArrayCheckboxChange}
                />
                {type === "Дом" ? "Частный дом" : type}{" "}
                {/* Отображаем 'Частный дом' для 'Дом' */}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterPanel;
