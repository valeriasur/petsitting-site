// backend/service/pdf-generator-service.js
const {
  PDFDocument,
  StandardFonts,
  rgb,
  PageSizes,
  PDFFont,
} = require("pdf-lib");
const fs = require("fs").promises;
const path = require("path");
const ApiError = require("../exceptions/api-error");
const fontkit = require("fontkit");

// ID услуг (если они влияют на выбор текста договора)
const BOARDING_SERVICE_ID = 1;
const WALKING_SERVICE_ID = 2;
const HOUSESITTING_SERVICE_ID = 3;

class PdfGeneratorService {
  // getTemplatePath больше не нужен, если генерируем с нуля для всех
  // Если для разных услуг нужны РАЗНЫЕ тексты договора, то тут нужна будет логика
  // для выбора текста. Пока сделаем один общий.

  // Вспомогательная функция для отрисовки текста с переносом строк
  async drawTextWithWrapping(
    page,
    text,
    x,
    y,
    maxWidth,
    lineHeight,
    font,
    fontSize,
    color
  ) {
    const words = text.split(" ");
    let currentLine = "";
    let currentY = y;

    for (const word of words) {
      const testLine = currentLine + (currentLine ? " " : "") + word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (textWidth > maxWidth && currentLine) {
        page.drawText(currentLine, {
          x,
          y: currentY,
          font,
          size: fontSize,
          color,
        });
        currentLine = word;
        currentY -= lineHeight;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      page.drawText(currentLine, {
        x,
        y: currentY,
        font,
        size: fontSize,
        color,
      });
      currentY -= lineHeight;
    }
    return currentY; // Возвращаем новую Y позицию
  }

  async generateContract(bookingData) {
    try {
      console.log(
        "========= ДАННЫЕ ПОЛУЧЕННЫЕ В PDF GENERATOR SERVICE ========="
      );
      console.log(JSON.stringify(bookingData, null, 2));
      console.log(
        "BookingData Sitter Object:",
        JSON.stringify(bookingData.Sitter, null, 2)
      );
      console.log(
        "BookingData SitterProfile Object:",
        JSON.stringify(bookingData.Sitter?.SitterProfile, null, 2)
      );
      console.log(
        "BookingData OfferedServices Array:",
        JSON.stringify(
          bookingData.Sitter?.SitterProfile?.OfferedServices,
          null,
          2
        )
      ); // Используем 'OfferedServices'
      console.log(
        "=============================================================="
      );

      console.log(
        "[PdfGeneratorService] ПРОГРАММНАЯ ГЕНЕРАЦИЯ договора для booking ID:",
        bookingData.id
      );

      console.log(
        "[PdfGeneratorService] ПРОГРАММНАЯ ГЕНЕРАЦИЯ договора для booking ID:",
        bookingData.id
      );
      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);

      let page = pdfDoc.addPage(PageSizes.A4);
      const { width, height } = page.getSize();

      let customFont;
      try {
        const fontBytes = await fs.readFile(
          // Убедитесь, что путь правильный! Судя по вашему предыдущему скриншоту VS Code,
          // папка fonts находится внутри backend, на одном уровне с service.
          path.join(__dirname, "..", "fonts", "LiberationSans-Regular.ttf")
        );
        customFont = await pdfDoc.embedFont(fontBytes);
        console.log(
          "[PdfGeneratorService] Шрифт LiberationSans-Regular.ttf успешно загружен и встроен."
        );
      } catch (e) {
        console.error(
          "Критическая ошибка: не удалось загрузить и встроить шрифт LiberationSans-Regular.ttf.",
          e
        );
        // Если шрифт не загружен, дальнейшая генерация с кириллицей будет невозможна корректно.
        // Можно либо бросить ошибку, либо использовать Helvetica и получить кракозябры/ошибку WinAnsi.
        // Лучше бросить ошибку, чтобы проблема была очевидна.
        throw ApiError.InternalServerError(
          "Не удалось загрузить шрифт для генерации PDF. Проверьте путь к файлу шрифта и наличие fontkit."
        );
        // customFont = await pdfDoc.embedFont(StandardFonts.Helvetica); // Убираем фоллбэк на Helvetica, чтобы ошибка была явной
      }

      const fontSize = 10;
      const titleFontSize = 14;
      const smallFontSize = 8;
      const textColor = rgb(0, 0, 0);
      const labelColor = rgb(0.3, 0.3, 0.3); // Более светлый для меток
      const lineHeight = fontSize * 1.4;
      const xMargin = 50;
      const contentWidth = width - 2 * xMargin;
      let yPosition = height - 40;

      // --- Функция для добавления строки "Метка: Значение" ---
      const drawFieldRow = (label, valueText, currentY) => {
        if (currentY < 50) {
          // Проверка на конец страницы
          page = pdfDoc.addPage(PageSizes.A4);
          currentY = height - 40;
        }
        page.drawText(`${label}:`, {
          x: xMargin,
          y: currentY,
          font: customFont,
          size: fontSize,
          color: labelColor,
        });
        // Используем drawTextWithWrapping для значения, если оно может быть длинным
        return this.drawTextWithWrapping(
          page,
          String(valueText || "N/A"),
          xMargin + 150,
          currentY,
          contentWidth - 150,
          lineHeight,
          customFont,
          fontSize,
          textColor
        );
      };
      // --- Функция для добавления заголовка раздела ---
      const drawSectionTitle = (title, currentY) => {
        if (currentY < 70) {
          page = pdfDoc.addPage(PageSizes.A4);
          currentY = height - 40;
        }
        yPosition -= lineHeight * 0.5; // Небольшой отступ перед заголовком
        page.drawText(title, {
          x: xMargin,
          y: currentY,
          font: customFont,
          size: fontSize + 2,
          color:
            textColor /* možete da iskoristite bold opciju ako je font podržava */,
        });
        currentY -= lineHeight * 1.5;
        return currentY;
      };

      // --- Заголовок документа ---
      let documentTitle = `ДОГОВОР ОКАЗАНИЯ УСЛУГ № ${bookingData.id || "N/A"}`; // По умолчанию
      const serviceIdNum = Number(bookingData.service_id);

      if (serviceIdNum === BOARDING_SERVICE_ID) {
        documentTitle = "Договор о передержке питомца";
      } else if (serviceIdNum === WALKING_SERVICE_ID) {
        documentTitle = "Договор на оказание услуг по выгулу питомца";
      } else if (serviceIdNum === HOUSESITTING_SERVICE_ID) {
        documentTitle = "Договор на оказание услуг няни для питомца";
      }
      // Можно добавить и другие варианты или оставить общий с номером, если услуга не одна из этих

      page.drawText(documentTitle, {
        // Используем новую переменную documentTitle
        x: xMargin,
        y: yPosition,
        font: customFont,
        size: titleFontSize,
        color: textColor,
      });
      yPosition -= titleFontSize * 2;

      const contractDate = new Date().toLocaleDateString("ru-RU");
      yPosition = await drawFieldRow(
        "Дата заключения",
        contractDate,
        yPosition
      );
      yPosition -= lineHeight; // Дополнительный отступ

      // --- Данные сторон ---
      const owner = bookingData.Owner || {};
      const sitter = bookingData.Sitter || {};
      const pet = bookingData.Pet || {};
      const sitterProfile = sitter.SitterProfile || {};
      const sitterOfferedServices = sitterProfile.OfferedServices || [];

      yPosition = await drawSectionTitle(
        "Сторона 1: Заказчик (Владелец питомца)",
        yPosition
      );
      const ownerFullName =
        `${owner.last_name || ""} ${owner.first_name || ""} ${
          owner.middle_name || ""
        }`.trim() || "N/A";
      yPosition = await drawFieldRow("ФИО", ownerFullName, yPosition);
      // yPosition = await drawFieldRow("Адрес", owner.address_details, yPosition); // Если нужно
      // yPosition = await drawFieldRow("Телефон", owner.phone, yPosition); // Если нужно

      yPosition = await drawSectionTitle(
        "Сторона 2: Исполнитель (Специалист по уходу)",
        yPosition
      );
      const sitterFullName =
        `${sitter.last_name || ""} ${sitter.first_name || ""} ${
          sitter.middle_name || ""
        }`.trim() || "N/A";
      yPosition = await drawFieldRow("ФИО", sitterFullName, yPosition);
      yPosition = await drawFieldRow(
        "Адрес",
        sitter.address_details,
        yPosition
      );
      // yPosition = await drawFieldRow("Телефон", sitter.phone, yPosition); // Если нужно
      yPosition -= lineHeight;

      // --- Информация о питомце ---
      yPosition = await drawSectionTitle(
        "Приложение №1: Информация о питомце",
        yPosition
      );
      yPosition = await drawFieldRow("Кличка", pet.name, yPosition);
      const petTypeBreed =
        `${pet.PetType?.name || ""}${
          pet.breed ? (pet.PetType?.name ? ", " : "") + pet.breed : ""
        }`.trim() || "N/A";
      yPosition = await drawFieldRow("Вид/Порода", petTypeBreed, yPosition);
      const petAge = pet.age?.toString()
        ? `${pet.age} ${this.pluralizePetAge(pet.age)}`
        : "N/A";
      yPosition = await drawFieldRow("Возраст", petAge, yPosition);
      yPosition = await drawFieldRow("Пол", pet.gender, yPosition);

      const petSterilized =
        typeof pet.is_sterilized === "boolean"
          ? pet.is_sterilized
            ? "Да"
            : "Нет"
          : "N/A";
      yPosition = await drawFieldRow(
        "Стерилизация/Кастрация",
        petSterilized,
        yPosition
      );

      // ----- НАЧАЛО ИЗМЕНЕНИЙ ДЛЯ ВАКЦИНАЦИИ -----
      const petVaccinatedText =
        typeof pet.is_vaccinated === "boolean"
          ? pet.is_vaccinated
            ? "Да"
            : "Нет"
          : // Если pet.is_vaccinated может быть строкой "true"/"false" из базы (маловероятно с Sequelize, но на всякий случай)
            // : (String(pet.is_vaccinated).toLowerCase() === 'true' ? "Да" :
            //   (String(pet.is_vaccinated).toLowerCase() === 'false' ? "Нет" : "N/A"));
            // Если pet.is_vaccinated может быть 1/0
            // : (pet.is_vaccinated === 1 ? "Да" : (pet.is_vaccinated === 0 ? "Нет" : "N/A"));
            "N/A"; // Если поле отсутствует или имеет неожиданный тип

      yPosition = await drawFieldRow(
        "Вакцинация",
        petVaccinatedText, // Используем новую переменную
        yPosition
      );

      yPosition = await drawFieldRow("Размер", pet.size, yPosition);
      yPosition = await drawFieldRow(
        "Описание/Особенности",
        pet.description || pet.behavioral_features || pet.special_needs,
        yPosition
      );
      const aloneHomeText = pet.alone_home || "N/A";
      yPosition = await drawFieldRow(
        "Может оставаться один дома",
        aloneHomeText,
        yPosition
      );

      // --- Условия оказания услуг ---
      yPosition = await drawSectionTitle("Условия оказания услуг", yPosition);
      const serviceName =
        bookingData.Service?.description ||
        bookingData.Service?.name ||
        "Услуга не определена";
      yPosition = await drawFieldRow(
        "Наименование услуги",
        serviceName,
        yPosition
      );

      if (serviceIdNum === BOARDING_SERVICE_ID) {
        // Для передержки (несколько дней или один полный день)
        const startDateFormatted = new Date(
          bookingData.start_datetime
        ).toLocaleDateString("ru-RU");
        yPosition = await drawFieldRow(
          "Дата начала",
          startDateFormatted,
          yPosition
        );
        const endDateFormatted = new Date(
          bookingData.end_datetime
        ).toLocaleDateString("ru-RU");
        yPosition = await drawFieldRow(
          "Дата окончания",
          endDateFormatted,
          yPosition
        );
      } else if (
        serviceIdNum === WALKING_SERVICE_ID ||
        serviceIdNum === HOUSESITTING_SERVICE_ID
      ) {
        // Для выгула или визита (один день, важно время)
        const dateTimeFormatted = new Date(
          bookingData.start_datetime
        ).toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        yPosition = await drawFieldRow(
          "Дата оказания услуги",
          dateTimeFormatted, // Показываем только дату
          yPosition
        );

        const startTimeFormatted = new Date(
          bookingData.start_datetime
        ).toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const endTimeFormatted = new Date(
          bookingData.end_datetime
        ).toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        });
        yPosition = await drawFieldRow(
          "Время",
          `${startTimeFormatted} - ${endTimeFormatted}`, // Показываем диапазон времени
          yPosition
        );

        // Можно также показать длительность, если это полезно
        const start = new Date(bookingData.start_datetime);
        const end = new Date(bookingData.end_datetime);
        const diffTimeMs = Math.abs(end - start);
        const durationMinutes = Math.round(diffTimeMs / (1000 * 60));
        let durationText = "";
        if (durationMinutes > 0) {
          if (durationMinutes < 60) {
            durationText = `${durationMinutes} мин.`;
          } else {
            const hours = Math.floor(durationMinutes / 60);
            const minutes = durationMinutes % 60;
            durationText = `${hours} ч.`;
            if (minutes > 0) {
              durationText += ` ${minutes} мин.`;
            }
          }
          yPosition = await drawFieldRow(
            "Длительность",
            durationText,
            yPosition
          );
        }
      } else {
        // Общий случай для других возможных услуг (если появятся)
        const startDateTime = new Date(
          bookingData.start_datetime
        ).toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        yPosition = await drawFieldRow(
          "Дата и время начала",
          startDateTime,
          yPosition
        );
        const endDateTime = new Date(bookingData.end_datetime).toLocaleString(
          "ru-RU",
          {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }
        );
        yPosition = await drawFieldRow(
          "Дата и время окончания",
          endDateTime,
          yPosition
        );
      }

      let pricePerDayDisplay = "Не применимо";

      console.log("----- ДАННЫЕ ДЛЯ ЦЕНЫ ЗА УСЛУГУ -----");
      console.log("bookingData.service_id:", bookingData.service_id);
      console.log("BOARDING_SERVICE_ID (константа):", BOARDING_SERVICE_ID);
      console.log(
        "Sitter's User ID (bookingData.Sitter.id):",
        bookingData.Sitter?.id
      );
      console.log("SitterProfile ID (sitterProfile.id):", sitterProfile?.id);
      console.log(
        "bookingData.Sitter.SitterProfile.OfferedServices:",
        JSON.stringify(
          bookingData.Sitter?.SitterProfile?.OfferedServices,
          null,
          2
        )
      );
      console.log("----- КОНЕЦ ДАННЫХ ДЛЯ ЦЕНЫ -----");

      if (Number(bookingData.service_id) === BOARDING_SERVICE_ID) {
        const boardingServiceOffering = sitterOfferedServices.find(
          (sos) =>
            Number(sos.service_id) === BOARDING_SERVICE_ID &&
            sos.price_unit === "day"
        );
        if (
          boardingServiceOffering &&
          (typeof boardingServiceOffering.price === "number" ||
            typeof boardingServiceOffering.price === "string")
        ) {
          const priceValue = parseFloat(
            String(boardingServiceOffering.price).replace(/\s/g, "")
          );
          if (!isNaN(priceValue)) {
            pricePerDayDisplay = `${priceValue.toFixed(0)} руб./сутки`;
          } else {
            pricePerDayDisplay = "N/A";
          } // Сюда попадает, если цена не число
        } else {
          pricePerDayDisplay = "N/A (не найдена цена)";
        } // <--- ВАШ СЛУЧАЙ, если boardingServiceOffering не найден
      }
      // Если это не BOARDING_SERVICE_ID, то pricePerDayDisplay останется "Не применимо", что тоже может быть не то, что вы хотите для других услуг.
      // Сейчас мы сфокусированы на передержке.

      yPosition = await drawFieldRow(
        "Стоимость за единицу услуги",
        pricePerDayDisplay,
        yPosition
      );

      const totalPrice = bookingData.total_price
        ? `${parseFloat(
            String(bookingData.total_price).replace(/\s/g, "")
          ).toFixed(0)} руб.`
        : "N/A";
      yPosition = await drawFieldRow(
        "Общая стоимость услуг",
        totalPrice,
        yPosition
      );
      yPosition -= lineHeight;

      // --- Доверенное лицо (если есть) ---
      if (owner.confidant_first_name) {
        yPosition = await drawSectionTitle(
          "Приложение №2: Доверенное лицо Заказчика",
          yPosition
        );
        const confidantFullName = `${owner.confidant_last_name || ""} ${
          owner.confidant_first_name || ""
        } ${owner.confidant_middle_name || ""}`.trim();
        yPosition = await drawFieldRow("ФИО", confidantFullName, yPosition);
        yPosition = await drawFieldRow(
          "Телефон",
          owner.confidant_phone,
          yPosition
        );
        yPosition -= lineHeight;
      }

      // --- Основной текст договора (очень упрощенно) ---
      yPosition = await drawSectionTitle("Основные положения", yPosition);
      const mainText1 = `1. Исполнитель обязуется оказать услуги по уходу и передержке указанного Животного в соответствии с информацией, предоставленной Заказчиком и условиями настоящего Договора.`;
      yPosition = await this.drawTextWithWrapping(
        page,
        mainText1,
        xMargin,
        yPosition,
        contentWidth,
        lineHeight,
        customFont,
        fontSize,
        textColor
      );
      yPosition -= lineHeight * 0.5;
      const mainText2 = `2. Заказчик обязуется предоставить достоверную информацию о Животном, его здоровье, привычках и особенностях ухода, а также своевременно оплатить услуги Исполнителя.`;
      yPosition = await this.drawTextWithWrapping(
        page,
        mainText2,
        xMargin,
        yPosition,
        contentWidth,
        lineHeight,
        customFont,
        fontSize,
        textColor
      );
      yPosition -= lineHeight * 2; // Больший отступ перед подписями

      // --- Место для подписей (просто текст, не поля формы) ---
      yPosition = await drawSectionTitle("Подписи сторон", yPosition);
      yPosition = await drawFieldRow(
        "Заказчик (Владелец)",
        "____________________ / " + ownerFullName + " /",
        yPosition
      );
      yPosition -= lineHeight * 0.5;
      yPosition = await drawFieldRow(
        "Исполнитель (Специалист)",
        "____________________ / " + sitterFullName + " /",
        yPosition
      );

      // PDF НЕ СОДЕРЖИТ ИНТЕРАКТИВНЫХ ПОЛЕЙ ФОРМЫ в этом варианте.
      // Весь текст вставляется напрямую.
      // Если вам нужны были именно поля формы для последующего редактирования,
      // то нужно было бы использовать form.createTextField и addToPage для каждого значения.
      // Сейчас я сделал так, чтобы все данные были просто текстом в PDF.

      const pdfBytes = await pdfDoc.save();

      // Сохранение файла
      const staticDir = path.join(__dirname, "..", "static");
      const contractsDir = path.join(staticDir, "contracts");
      await fs.mkdir(contractsDir, { recursive: true });
      const filename = `booking_${bookingData.id}_contract_generated.pdf`;
      const filePathOnDisk = path.join(contractsDir, filename);
      await fs.writeFile(filePathOnDisk, pdfBytes);
      console.log(
        `[PdfGeneratorService] Программно сгенерированный PDF сохранен: ${filePathOnDisk}`
      );
      const contractPathForDB = path
        .join("contracts", filename)
        .replace(/\\/g, "/");
      return contractPathForDB;
    } catch (error) {
      console.error(
        "[PdfGeneratorService] Критическая ошибка при программной генерации PDF:",
        error
      );
      if (error instanceof ApiError) {
        // Если это уже наш ApiError
        throw error;
      }
      // Оборачиваем другие ошибки в ApiError.InternalServerError
      throw ApiError.InternalServerError(
        `Ошибка при программной генерации договора: ${error.message}`
      );
    }
  }

  // Вспомогательные функции
  pluralizePetAge(number) {
    if (typeof number !== "number" || isNaN(number)) return "лет"; // Фоллбэк
    const mod10 = number % 10;
    const mod100 = number % 100;
    if (mod10 === 1 && mod100 !== 11) return "год";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
      return "года";
    return "лет";
  }

  pluralizeYears(number) {
    // Не используется в текущем варианте, но оставим
    return this.pluralizePetAge(number);
  }

  async drawTextWithWrapping(
    page,
    text,
    x,
    y,
    maxWidth,
    lineHeight,
    font,
    fontSize,
    color
  ) {
    const words = text.split(" ");
    let currentLine = "";
    let currentY = y;

    for (const word of words) {
      const testLine = currentLine + (currentLine ? " " : "") + word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (textWidth > maxWidth && currentLine) {
        page.drawText(currentLine, {
          x,
          y: currentY,
          font,
          size: fontSize,
          color,
        });
        currentLine = word;
        currentY -= lineHeight;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      page.drawText(currentLine, {
        x,
        y: currentY,
        font,
        size: fontSize,
        color,
      });
      currentY -= lineHeight;
    }
    return currentY;
  }
}

module.exports = new PdfGeneratorService();
