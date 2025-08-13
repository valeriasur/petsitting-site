import React, { useState, useEffect, useCallback } from "react";
import FilterPanel from "./FilterPanel";
import ResultsList from "./ResultsList";
import Pagination from "./Pagination";
import "./SearchPage.css";

const MAX_PRICE_VALUE = 5000;
//  Начальные значения фильтров

const initialFilters = {
  location: "Санкт-Петербург",
  serviceType: "boarding",
  startDate: "",
  endDate: "",
  maxPrice: MAX_PRICE_VALUE, // Используем MAX_PRICE_VALUE как начальное ("Любая")
  petSizes: [],
  petAgeCategory: null,
  sitterHasNoDogs: false,
  sitterHasNoCats: false,
  sitterHasNoOtherPets: false,
  sitterCanGiveMeds: false,
  sitterCanInject: false,
  sitterHasNoKids: false,
  sitterHasConstantSupervision: false,
  housingTypes: [],
  sortBy: "default",
  minRating: null,
};

function SearchPage() {
  // --- Состояния Компонента ---
  const [filters, setFilters] = useState(initialFilters);
  const [results, setResults] = useState([]); // Результаты поиска
  const [isLoading, setIsLoading] = useState(false); // Флаг загрузки
  const [error, setError] = useState(null); // Сообщение об ошибке
  const [totalResults, setTotalResults] = useState(0); // Общее количество результатов
  const [currentPage, setCurrentPage] = useState(1); // Текущая страница пагинации
  const resultsPerPage = 30; // Количество результатов на странице

  const [isAdvancedSearchVisible, setIsAdvancedSearchVisible] = useState(false); // Видимость расширенных фильтров

  //  Функция помощник для добавления параметров в URL
  const addParam = useCallback((params, key, value) => {
    // Проверяем, что значение не пустое/null/false и массив не пустой
    if (
      value !== null &&
      value !== "" &&
      value !== false &&
      (!Array.isArray(value) || value.length > 0)
    ) {
      if (Array.isArray(value)) {
        // Для массивов добавляем каждый элемент как отдельный параметр
        value.forEach((item) => params.append(key, item));
      } else {
        params.append(key, value);
      }
    }
  }, []);

  // Функция загрузки данных
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null); // Сбрасываем ошибку перед новым запросом
    console.log(
      "Запрашиваем данные с фильтрами:",
      filters,
      "Страница:",
      currentPage
    );

    const params = new URLSearchParams();

    // Добавляем параметры в запрос
    addParam(params, "location", filters.location);
    addParam(params, "serviceType", filters.serviceType);
    addParam(params, "startDate", filters.startDate);
    addParam(params, "endDate", filters.endDate);
    // Отправляем max_price, только если он меньше максимального ("Любая")
    if (filters.maxPrice < MAX_PRICE_VALUE) {
      addParam(params, "max_price", filters.maxPrice);
    }
    addParam(params, "petSizes", filters.petSizes);
    addParam(params, "petAgeCategory", filters.petAgeCategory);
    addParam(params, "sitterHasNoDogs", filters.sitterHasNoDogs);
    addParam(params, "sitterHasNoCats", filters.sitterHasNoCats);
    addParam(params, "sitterHasNoOtherPets", filters.sitterHasNoOtherPets);
    addParam(params, "sitterCanGiveMeds", filters.sitterCanGiveMeds);
    addParam(params, "sitterCanInject", filters.sitterCanInject);
    addParam(params, "sitterHasNoKids", filters.sitterHasNoKids);
    addParam(
      params,
      "sitterHasConstantSupervision",
      filters.sitterHasConstantSupervision
    );
    addParam(params, "housingTypes", filters.housingTypes);
    if (filters.sortBy && filters.sortBy !== "default") {
      addParam(params, "sortBy", filters.sortBy); // Отправляем sortBy (e.g., "price_asc")
    }
    if (filters.minRating !== null && filters.minRating > 0) {
      addParam(params, "min_rating", filters.minRating);
    }

    // Добавляем параметры пагинации
    params.append("page", currentPage.toString());
    params.append("limit", resultsPerPage.toString());

    const apiUrl = `http://localhost:5000/api/sitters?${params.toString()}`;
    console.log("SearchPage: Request URL:", apiUrl);

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        // Обрабатываем HTTP ошибки (4xx, 5xx)
        const errorData = await response.text();
        console.error("Server response error:", response.status, errorData);
        throw new Error(
          `Ошибка сети: ${response.status}. ${errorData || response.statusText}`
        );
      }
      const data = await response.json(); // Парсим JSON ответа
      console.log("SearchPage: Received data:", data);
      setResults(data.sitters || []); // Устанавливаем результаты
      setTotalResults(data.total || 0); // Устанавливаем общее количество
    } catch (err) {
      console.error("Ошибка при загрузке данных:", err);
      setError(
        err.message ||
          "Не удалось загрузить догситтеров. Попробуйте обновить страницу."
      );
      setResults([]); // Очищаем результаты при ошибке
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage, resultsPerPage, addParam]);

  // Эффект для вызова fetchData при изменении фильтров или страницы
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = useCallback((changedFilter) => {
    console.log("handleFilterChange received:", changedFilter);
    // Обновляем состояние filters, объединяя старые и новые значения
    setFilters((prevFilters) => ({
      ...prevFilters,
      ...changedFilter, // Применяем изменения
    }));
    setCurrentPage(1); // Сбрасываем на первую страницу при любом изменении фильтра
  }, []); // Пустой массив зависимостей

  // --- Обработчик смены страницы пагинации ---
  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0); // Прокрутка вверх страницы
  }, []);

  // --- Переключатель видимости расширенных фильтров ---
  const toggleAdvancedSearch = useCallback(() => {
    setIsAdvancedSearchVisible((prev) => !prev);
  }, []);

  // --- Сброс фильтров ---
  const handleResetFilters = useCallback(() => {
    setFilters(initialFilters); // Возвращаем начальные значения
    setCurrentPage(1); // Сбрасываем страницу
    setIsAdvancedSearchVisible(false); // Скрываем расширенные фильтры
    console.log("Filters reset to initial state.");
  }, []);

  return (
    <>
      <h1> Найти помощника </h1>
      <div className="search-page-container">
        <FilterPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          isAdvancedSearchVisible={isAdvancedSearchVisible}
          toggleAdvancedSearch={toggleAdvancedSearch}
          onResetFilters={handleResetFilters}
          maxPriceValue={MAX_PRICE_VALUE} // Передаем максимальное значение для слайдера
        />
        <div className="search-results-area">
          {/* Индикатор загрузки */}
          {isLoading && <p className="loading-message">Загрузка...</p>}

          {/* Сообщение об ошибке */}
          {error && <p className="error-message">{error}</p>}

          {/* Отображение результатов и пагинации (только если нет загрузки и ошибки) */}
          {!isLoading && !error && (
            <>
              <p className="results-summary">
                {totalResults > 0
                  ? `${(currentPage - 1) * resultsPerPage + 1}-${Math.min(
                      currentPage * resultsPerPage,
                      totalResults
                    )} из ${totalResults} найденных догситтеров`
                  : "По вашему запросу ничего не найдено"}
              </p>
              {/* Передаем массив результатов в ResultsList */}
              <ResultsList sitters={results} />

              {totalResults > resultsPerPage && (
                <Pagination
                  currentPage={currentPage}
                  totalResults={totalResults}
                  resultsPerPage={resultsPerPage}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default SearchPage;
