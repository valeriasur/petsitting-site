// src/components/SitterStep2Services.jsx
import React, { useCallback } from "react"; // Добавлен useCallback
import "./SitterApplicationPage.css"; // Используем общие стили

export default function SitterStep2Services({ data, setData }) {
  // --- Обработчики изменений ---

  // Обработчик изменения состояния чекбокса услуги
  const handleCheckboxChange = useCallback(
    (service) => {
      setData((prev) => {
        const currentServices = prev?.services || {};
        const currentServiceData = currentServices[service] || {};
        const newEnabledState = !currentServiceData.enabled;

        const newServiceData = {
          ...currentServiceData,
          enabled: newEnabledState,
        };

        if (
          service === "boarding" &&
          newEnabledState &&
          newServiceData.maxDogs === undefined
        ) {
          console.log("Setting default maxDogs to 1 for boarding");
          newServiceData.maxDogs = 1;
        }

        return {
          ...prev,
          services: {
            ...currentServices,
            [service]: newServiceData,
          },
        };
      });
    },
    [setData]
  ); // Зависимость только от setData (стабильная ссылка)

  // Обработчик изменения значений в полях ввода (цены, количество)
  const handleValueChange = useCallback(
    (service, field, value) => {
      let processedValue = value; // Значение по умолчанию

      // Специальная обработка для поля 'maxDogs'
      if (field === "maxDogs") {
        // Пытаемся преобразовать в целое число
        const intValue = parseInt(value, 10);
        // Если не число или меньше 1, устанавливаем 1, иначе используем полученное число
        processedValue = isNaN(intValue) || intValue < 1 ? 1 : intValue;
      }
      // Обработка для полей цен (оставляем только цифры и одну точку)
      else if (
        // ИЗМЕНЕНО: Используем новые имена полей для цен
        ["ratePerDay", "ratePer30MinWalk", "ratePer30MinHouseSit"].includes(
          field
        )
      ) {
        processedValue = value.replace(/[^0-9.]/g, "");
        if (processedValue.split(".").length > 2) {
          console.warn("Неверный формат цены (слишком много точек)");
          return;
        }
      }

      setData((prev) => {
        const currentServices = prev?.services || {};
        const currentServiceData = currentServices[service] || {
          enabled: false,
        };
        return {
          ...prev,
          services: {
            ...currentServices,
            [service]: {
              ...currentServiceData,
              [field]: processedValue,
            },
          },
        };
      });
    },
    [setData]
  );

  const services = data?.services || {};
  // ИЗМЕНЕНО: Деструктуризация и значения по умолчанию для новых полей
  const boardingData = services.boarding || {
    enabled: false,
    ratePerDay: "", // Новое имя
    maxDogs: 1,
  };
  const walkingData = services.walking || {
    enabled: false,
    ratePer30MinWalk: "", // Новое имя
  };
  const houseSittingData = services.houseSitting || {
    enabled: false,
    ratePer30MinHouseSit: "", // Новое имя
  };

  // --- JSX разметка ---
  return (
    <div className="sitter-step-content">
      <h4>Мои услуги</h4>
      <p className="step-description">
        Выберите услуги, которые вы готовы оказывать, и укажите их стоимость.
      </p>

      <div className="commission-info"> Комиссия сервиса составляет 20%. </div>

      {/* --- Блок Передержка --- */}
      <div className="service-block">
        <label className="service-toggle">
          <input
            type="checkbox"
            checked={boardingData.enabled}
            onChange={() => handleCheckboxChange("boarding")}
          />
          <span className="checkmark"></span> Передержка
        </label>
        {boardingData.enabled && (
          <>
            <p className="service-description">
              Вы берете питомца клиента в свой дом.
            </p>
            <div className="form-group price-group">
              <label htmlFor="boardingRatePerDay">
                Стоимость передержки (1 питомец)
              </label>
              <input
                type="text"
                inputMode="decimal"
                id="boardingRatePerDay"
                // ИЗМЕНЕНО: value={boardingData.ratePerDay ?? ""}
                value={boardingData.ratePerDay ?? ""}
                onChange={(e) =>
                  // ИЗМЕНЕНО: handleValueChange("boarding", "ratePerDay", e.target.value)
                  handleValueChange("boarding", "ratePerDay", e.target.value)
                }
              />
              <span>рублей в сутки</span>
            </div>

            <div className="form-group">
              <label htmlFor="maxDogs">Максимальное количество питомцев</label>
              <input
                type="number"
                id="maxDogs"
                min="1"
                step="1"
                value={boardingData.maxDogs ?? 1}
                onChange={(e) =>
                  handleValueChange("boarding", "maxDogs", e.target.value)
                }
              />
            </div>
          </>
        )}
      </div>

      {/* --- Блок Выгул --- */}
      <div className="service-block">
        <label className="service-toggle">
          <input
            type="checkbox"
            checked={walkingData.enabled}
            onChange={() => handleCheckboxChange("walking")}
          />
          <span className="checkmark"></span> Выгул
        </label>
        {walkingData.enabled && (
          <>
            <p className="service-description">
              Выгул питомцев в вашем районе.
            </p>
            <div className="form-group price-group">
              <label htmlFor="walkRatePer30Min">
                Стоимость за 30 минут прогулки
              </label>
              <input
                type="text"
                inputMode="decimal"
                id="walkRatePer30Min"
                // ИЗМЕНЕНО: value={walkingData.ratePer30MinWalk ?? ""}
                value={walkingData.ratePer30MinWalk ?? ""}
                onChange={(e) =>
                  // ИЗМЕНЕНО: handleValueChange("walking", "ratePer30MinWalk", e.target.value)
                  handleValueChange(
                    "walking",
                    "ratePer30MinWalk",
                    e.target.value
                  )
                }
              />
              <span>рублей</span>
            </div>
            {/* Поле "Стоимость за каждые доп. полчаса" УДАЛЕНО */}
          </>
        )}
      </div>
      {/* --- Блок Визит няни --- */}
      <div className="service-block">
        <label className="service-toggle">
          <input
            type="checkbox"
            checked={houseSittingData.enabled}
            onChange={() => handleCheckboxChange("houseSitting")}
          />
          <span className="checkmark"></span> Визит няни
        </label>
        {houseSittingData.enabled && (
          <>
            <p className="service-description">
              Уход за питомцами клиентов на их территории.
            </p>
            <div className="form-group price-group">
              <label htmlFor="visitRatePer30Min">
                Стоимость за 30 минут визита
              </label>
              <input
                type="text"
                inputMode="decimal"
                id="visitRatePer30Min"
                // ИЗМЕНЕНО: value={houseSittingData.ratePer30MinHouseSit ?? ""}
                value={houseSittingData.ratePer30MinHouseSit ?? ""}
                onChange={(e) =>
                  // ИЗМЕНЕНО: handleValueChange("houseSitting", "ratePer30MinHouseSit", e.target.value)
                  handleValueChange(
                    "houseSitting",
                    "ratePer30MinHouseSit",
                    e.target.value
                  )
                }
              />
              <span>рублей</span>
            </div>
            {/* Поля "Стоимость визита на 15 минут", "на 1 час", "на доп. час" УДАЛЕНЫ */}
          </>
        )}
      </div>
    </div>
  );
}
