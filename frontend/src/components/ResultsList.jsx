// src/components/ResultsList.js
import React from "react";
import SitterCard from "./SitterCard"; // Импортируем компонент для одной карточки

// Принимает массив 'sitters' как prop
function ResultsList({ sitters }) {
  // Логирование полученных пропсов для отладки
  console.log("ResultsList received sitters:", sitters);

  // Если массив пустой или не пришел (sitters = null или undefined),
  // показываем сообщение "не найдено", которое уже есть в SearchPage.
  // Здесь лучше просто ничего не рендерить или вернуть null.
  if (!sitters || !Array.isArray(sitters) || sitters.length === 0) {
    console.log("ResultsList: No sitters array or empty array received.");
    return null; // Ничего не рендерим, сообщение об отсутствии результатов покажет SearchPage
  }

  // Если ситтеры есть, рендерим список
  return (
    // Добавляем класс для возможной стилизации контейнера списка
    <div className="results-list-container">
      {
        /*
         * Используем метод массива .map() для итерации по массиву sitters.
         * Для КАЖДОГО объекта 'sitter' в массиве мы создаем и возвращаем
         * компонент <SitterCard>.
         */
        sitters.map((sitter) => {
          // Логируем данные, передаваемые в каждую карточку
          console.log("ResultsList rendering card for sitter:", sitter);

          // Проверяем наличие уникального ключа.
          // user_id должен приходить из UserAccount, а id - из SitterProfile.
          // Лучше использовать ID основного объекта (SitterProfile), если он есть.
          const uniqueKey =
            sitter.SitterProfile?.id || sitter.user_id || Math.random(); // Запасной вариант с Math.random не идеален
          if (!sitter.SitterProfile?.id && !sitter.user_id) {
            console.warn(
              "SitterCard is missing a reliable unique key (SitterProfile.id or user_id). Using Math.random().",
              sitter
            );
          }

          // Рендерим компонент SitterCard для текущего ситтера
          return (
            <SitterCard
              key={uniqueKey} // Используем уникальный key
              sitter={sitter} // Передаем ВЕСЬ объект ситтера в SitterCard
            />
          );
        })
      }
    </div>
  );
}

export default ResultsList;
