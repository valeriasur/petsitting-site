// HomePage.jsx
import React from "react";
import "./HomePage.css"; // Будем обновлять этот файл

import { useNavigate } from "react-router-dom";

// Иконки для преимуществ (если хотите заменить картинки p1.jpg и т.д.)
// import CareIcon from '../images/icons/care-icon.svg'; // Пример
// import WalkIcon from '../images/icons/walk-icon.svg';
// import FoodIcon from '../images/icons/food-icon.svg';
// import HomeIcon from '../images/icons/home-icon.svg';

export default function HomePage() {
  const navigate = useNavigate();

  // Оставляем ваши данные для списка, но можно будет заменить imageUrl на импортированные иконки
  const whyChooseUsItems = [
    {
      // id: 1, // Добавьте id для ключа, если NumberedList его использует
      imageUrl: "/p1.jpg", // Замените на путь к реальной иконке/картинке или импорт
      // icon: CareIcon, // Если будете использовать SVG иконки
      title: "Надежный уход",
      text: "Будь то собака, кошка или попугай, мы обеспечим комфорт, внимание и заботу о вашем питомце.",
    },
    {
      // id: 2,
      imageUrl: "/p2.jpg",
      // icon: WalkIcon,
      title: "Активные прогулки",
      text: "Выгуляем вашу собаку, подберем подходящую физическую нагрузку и маршрут для веселой прогулки.",
    },
    {
      // id: 3,
      imageUrl: "/p3.jpg",
      // icon: FoodIcon,
      title: "Кормление и гигиена",
      text: "Вовремя покормим по вашим инструкциям, почистим лоток, дадим лекарства по расписанию.",
    },
    {
      // id: 4,
      imageUrl: "/p4.jpg",
      // icon: HomeIcon,
      title: "Забота на вашей территории",
      text: "Приедем к вам, чтобы питомец чувствовал себя в привычной и безопасной домашней обстановке.",
    },
  ];

  const handleGoToSearch = () => {
    navigate("/searchPage"); // Убедитесь, что путь правильный (с / в начале)
  };

  const handleGoToBecomeSitter = () => {
    navigate("/becomeSitter"); // Путь к странице "Стать помощником"
  };

  return (
    <div className="home-page-container">
      <section className="hero-section">
        <div className="hero-content">
          <h1>Заботимся о ваших питомцах, когда вам нужно! 🐾</h1>
          <p className="hero-subtitle">
            Уезжаете в командировку, задерживаетесь на работе или планируете
            отпуск? Мы готовы позаботиться о вашем любимце, пока вас нет рядом!
          </p>

          <div className="steps-container">
            <div className="step-item">
              <div className="step-number">1</div>
              <h3>Зарегистрируйтесь</h3>
              <p>Создайте аккаунт и добавьте информацию о вашем питомце.</p>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <h3>Найдите помощника</h3>
              <p>
                Используйте удобный поиск и фильтры, чтобы выбрать идеального
                работника.
              </p>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <h3>Наслаждайтесь спокойствием</h3>
              <p>
                Ваш питомец в надежных руках, а вы получаете регулярные
                фотоотчеты.
              </p>
            </div>
          </div>
          <button
            onClick={handleGoToSearch}
            className="custom-button hero-cta-button-style" // Используем общий класс + специфичный для стилизации
          >
            Найти помощника для питомца
          </button>
        </div>
      </section>

      {/* Секция "Почему выбирают нас?" */}
      <section className="why-choose-us-section">
        <h2>Почему выбирают нас?</h2>

        <div className="features-grid">
          {whyChooseUsItems.map((item, index) => (
            <div key={index} className="feature-item">
              {/* Если используете иконки вместо картинок из listItems */}
              {/* item.icon && <img src={item.icon} alt={item.title} className="feature-item-icon" /> */}
              <img
                src={item.imageUrl}
                alt={item.title}
                className="feature-item-image"
              />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="become-sitter-section">
        <h2>Любите животных и хотите помогать?</h2>
        <p>
          Присоединяйтесь к нашему сообществу догситтеров и кэтситтеров!
          Зарабатывайте, занимаясь любимым делом, и дарите радость питомцам и их
          владельцам.
        </p>
        {/* ИЗМЕНЕНИЕ ЗДЕСЬ */}
        <button
          onClick={handleGoToBecomeSitter}
          className="custom-button hero-cta-button-style"
        >
          Стать помощником
        </button>
      </section>
    </div>
  );
}
