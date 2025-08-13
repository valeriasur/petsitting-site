// service/mail-service.js
const nodemailer = require("nodemailer");
const ApiError = require("../exceptions/api-error"); // Добавляем для обработки ошибок

class MailService {
  constructor() {
    // Настройка транспортера
    // Используйте переменные окружения для безопасности!
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, // e.g., smtp.gmail.com или smtp.mail.ru
        port: process.env.SMTP_PORT, // e.g., 587 или 465
        secure: process.env.SMTP_PORT === "465", // true для порта 465, false для других (например, 587)
        auth: {
          user: process.env.SMTP_USER, // Ваш email (логин от почты)
          pass: process.env.SMTP_PASSWORD, // Пароль (пароль приложения для Gmail/Mail.ru или обычный)
        },
        // Добавьте это, если есть проблемы с самоподписанными сертификатами (НЕ рекомендуется для продакшена)
        // tls: {
        //   rejectUnauthorized: false
        // }
      });
      console.log("Nodemailer транспортер сконфигурирован.");
    } catch (error) {
      console.error("Ошибка конфигурации Nodemailer:", error);
      // Вы можете либо бросить ошибку, либо установить транспортер в null/undefined
      // и проверять его наличие перед отправкой
      this.transporter = null;
      console.error(
        "Отправка email будет невозможна из-за ошибки конфигурации."
      );
    }
  }

  async sendActivationMail(toEmail, token) {
    if (!this.transporter) {
      console.error(
        "Попытка отправить email без сконфигурированного транспортера."
      );
      throw ApiError.InternalServerError("Сервис отправки email не настроен.");
    }

    // Формируем ссылку активации (новый роут)
    const activationLink = `${process.env.API_URL}/api/activate/${token}`; // Используем /api/activate/

    console.log(
      `Попытка отправки письма для активации аккаунта на ${toEmail} со ссылкой: ${activationLink}`
    );
    try {
      const info = await this.transporter.sendMail({
        from: `Doggy App <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: "Активируйте ваш аккаунт на Doggy App", // Новая тема
        text: `Здравствуйте! Спасибо за регистрацию на Doggy App. Для активации вашего аккаунта, перейдите по ссылке: ${activationLink}`, // Новый текст
        html: `
                <div>
                    <h1>Активация аккаунта</h1>
                    <p>Добро пожаловать на Хвостатый друг!</p>
                    <p>Пожалуйста, перейдите по ссылке ниже, чтобы активировать ваш аккаунт:</p>
                    <p><a href="${activationLink}" target="_blank" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Активировать аккаунт</a></p>
                    <p>Или скопируйте и вставьте эту ссылку в адресную строку браузера:</p>
                    <p><a href="${activationLink}" target="_blank">${activationLink}</a></p>
                    <p>Если вы не регистрировались на нашем сайте, просто проигнорируйте это письмо.</p>
                    <br>
                    <p>С уважением,<br>Команда Doggy App</p>
                </div>
            `, // Новый HTML
      });
      console.log(
        `Письмо активации успешно отправлено на ${toEmail}. Message ID: ${info.messageId}`
      );
    } catch (error) {
      console.error(`Ошибка отправки письма активации на ${toEmail}:`, error);
      throw ApiError.InternalServerError(
        "Не удалось отправить письмо для активации аккаунта",
        error
      );
    }
  }

  async sendNewBookingNotification(
    sitterEmail,
    ownerName,
    petName,
    serviceName,
    startDateStr,
    endDateStr,
    bookingId
  ) {
    if (!this.transporter) {
      console.error(
        "Попытка отправить уведомление о бронировании без транспортера."
      );
      // Не бросаем ошибку, просто логируем и выходим, чтобы не ломать основной процесс
      return;
    }

    const bookingLink = `${process.env.CLIENT_URL}/profile/my-bookings`; // Пример ссылки на бронирования

    console.log(
      `Попытка отправки уведомления о новом бронировании на ${sitterEmail}`
    );
    try {
      await this.transporter.sendMail({
        from: `Doggy App <${process.env.SMTP_USER}>`,
        to: sitterEmail,
        subject: `Новое бронирование #${bookingId} на Doggy App!`,
        text: `Здравствуйте! У вас новое бронирование.\n\nКлиент: ${
          ownerName || "Имя не указано"
        }\nПитомец: ${petName || "Имя не указано"}\nУслуга: ${
          serviceName || "Не указано"
        }\nДаты: с ${startDateStr} по ${endDateStr}\n\nПожалуйста, просмотрите детали и подтвердите бронирование в вашем личном кабинете: ${bookingLink}`,
        html: `
                <div>
                    <h2>Новое бронирование #${bookingId}</h2>
                    <p>Здравствуйте!</p>
                    <p>Вы получили новый запрос на бронирование услуг:</p>
                    <ul>
                        <li><strong>Клиент:</strong> ${
                          ownerName || "Имя не указано"
                        }</li>
                        <li><strong>Питомец:</strong> ${
                          petName || "Имя не указано"
                        }</li>
                        <li><strong>Услуга:</strong> ${
                          serviceName || "Не указано"
                        }</li>
                        <li><strong>Даты:</strong> с ${new Date(
                          startDateStr
                        ).toLocaleDateString("ru-RU")} по ${new Date(
          endDateStr
        ).toLocaleDateString("ru-RU")}</li>
                    </ul>
                    <p>Пожалуйста, войдите в ваш личный кабинет, чтобы просмотреть детали и подтвердить или отклонить бронирование:</p>
                    <p><a href="${bookingLink}" target="_blank" style="background-color: #28a745; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Перейти к бронированиям</a></p>
                    <br>
                    <p>С уважением,<br>Команда Doggy App</p>
                </div>
            `,
      });
      console.log(
        `Уведомление о бронировании #${bookingId} успешно отправлено на ${sitterEmail}.`
      );
    } catch (error) {
      // Логируем ошибку, но не прерываем выполнение createBooking
      console.error(
        `Ошибка отправки уведомления о бронировании #${bookingId} на ${sitterEmail}:`,
        error
      );
    }
  }
}

module.exports = new MailService();
