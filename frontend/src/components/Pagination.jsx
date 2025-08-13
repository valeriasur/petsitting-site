// src/components/Pagination.js
import React from "react";

function Pagination({
  currentPage,
  totalResults,
  resultsPerPage,
  onPageChange,
}) {
  const totalPages = Math.ceil(totalResults / resultsPerPage);

  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    // Используем существующий className pagination
    <nav className="pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="pagination-button pagination-button-prev" // Добавлены классы
      >
        Назад
      </button>

      {pageNumbers.map((number) => (
        <button
          key={number}
          onClick={() => onPageChange(number)}
          // Условный класс для активной страницы
          className={`pagination-button pagination-button-number ${
            currentPage === number ? "active" : ""
          }`}
          disabled={currentPage === number} // Можно сделать текущую неактивной
        >
          {number}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="pagination-button pagination-button-next" // Добавлены классы
      >
        Вперед
      </button>
    </nav>
  );
}

export default Pagination;
