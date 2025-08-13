// src/pages/ServicesPage.jsx (или как вы назовете файл)
import React from "react";
import {
  Link, // Если CTA будут ссылками
} from "react-router-dom";
import "./ServicesPage.css"; // Создайте этот файл для стилей

// Импортируйте ваши изображения/иконки
import boardingIcon from "../images/boarding.png";
import housesittingIcon from "../images/housesitter.jpg";
import walkingIcon from "../images/walks.jpg";

// Примеры изображений для блоков "Как это работает"
import step1Icon from "../images/step1-icon.svg";
import step2Icon from "../images/step2-icon.svg";
import step3Icon from "../images/step3-icon.svg";

const ServicesPage = () => {
  const services = [
    {
      id: "boarding",
      title: "Передержка: забота как дома",
      imageUrl: boardingIcon, // Замените на ваше изображение
      description:
        "Оставляете питомца на время отпуска или командировки? Наши догситтеры и кэтситтеры предоставят ему комфорт и уход в домашней обстановке, как если бы он был с вами.",
      featuresTitle: "Что включено в передержку:",
      features: [
        {
          icon: step1Icon,
          text: "Проживание в уютных домашних условиях у ситтера.",
        },
        {
          icon: step2Icon,
          text: "Регулярное кормление и свежая вода по вашим инструкциям.",
        },
        {
          icon: step3Icon,
          text: "Прогулки, игры и внимание, чтобы питомец не скучал.",
        },
        {
          icon: null,
          text: "Ежедневные фото- и видеоотчеты для вашего спокойствия.",
        },
      ],
      ctaText: "Найти ситтера для передержки",
      ctaLink: "/searchPage", // Ссылка на страницу поиска с фильтром
    },
    {
      id: "housesitting",
      title: "Визит няни: уход на вашей территории",
      imageUrl: housesittingIcon, // Замените
      description:
        "Если ваш питомец предпочитает оставаться в привычной обстановке, наша няня придет к вам домой, чтобы покормить, поиграть и убедиться, что все в порядке.",
      featuresTitle: "Как проходит визит няни:",
      features: [
        {
          icon: step1Icon,
          text: "Няня приходит к вам домой в согласованное время.",
        },
        { icon: step2Icon, text: "Кормление, смена воды, уборка лотка." },
        { icon: step3Icon, text: "Игры, внимание и общение с питомцем." },
        {
          icon: null,
          text: "Проверка общего состояния питомца и порядка в доме.",
        },
      ],
      ctaText: "Найти няню для визита",
      ctaLink: "/searchPage",
    },
    {
      id: "walking",
      title: "Выгул: активные прогулки",
      imageUrl: walkingIcon, // Замените
      description:
        "Не успеваете погулять с собакой? Наши опытные выгульщики обеспечат ей необходимую физическую активность и свежий воздух в любое удобное для вас время.",
      featuresTitle: "Что делает выгульщик:",
      features: [
        {
          icon: step1Icon,
          text: "Забирает собаку из дома в назначенное время.",
        },
        {
          icon: step2Icon,
          text: "Активная прогулка по безопасному маршруту (от 30 минут).",
        },
        {
          icon: step3Icon,
          text: "Игры на свежем воздухе и социализация (по желанию).",
        },
        {
          icon: null,
          text: "После прогулки помоет лапы и накормит (при необходимости).",
        },
      ],
      ctaText: "Найти выгульщика",
      ctaLink: "/searchPage",
    },
  ];

  return (
    <div className="services-page">
      <header className="services-page-header">
        <h1>Наши Услуги</h1>
        <p className="services-intro">
          Мы знаем, как важны для вас ваши питомцы. Поэтому мы предлагаем только
          лучшие и проверенные услуги, чтобы вы могли быть спокойны, пока вас
          нет рядом.
        </p>
      </header>

      <div className="services-grid">
        {services.map((service) => (
          <section
            key={service.id}
            className={`service-section service-${service.id}`}
          >
            <div className="service-icon-container">
              <img
                src={service.imageUrl}
                alt={service.title}
                className="service-main-icon"
              />
            </div>
            <h2>{service.title}</h2>
            <p className="service-description">{service.description}</p>

            {service.features && service.features.length > 0 && (
              <div className="service-features">
                {service.featuresTitle && <h3>{service.featuresTitle}</h3>}
                <ul>
                  {service.features.map((feature, index) => (
                    <li key={index}>
                      {feature.icon && (
                        <img
                          src={feature.icon}
                          alt=""
                          className="feature-icon"
                        />
                      )}
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Link
              to={service.ctaLink}
              className="cta-button service-cta-button"
            >
              {service.ctaText}
            </Link>
          </section>
        ))}
      </div>

      <section className="services-page-common-cta">
        <h2>Готовы найти идеального помощника?</h2>
        <p>Тысячи проверенных помощников ждут ваших питомцев!</p>
        <Link to="/searchPage" className="cta-button primary-cta-button">
          Искать помощника сейчас
        </Link>
      </section>
    </div>
  );
};

export default ServicesPage;
