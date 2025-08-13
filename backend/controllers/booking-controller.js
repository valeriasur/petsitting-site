const bookingService = require("../service/booking-service"); // Создадим этот сервис
const ApiError = require("../exceptions/api-error");
const path = require("path"); // Для работы с путями
const fsSync = require("fs");

class BookingController {
  async createBooking(req, res, next) {
    try {
      // Валидация входных данных (можно использовать express-validator)
      const {
        sitterUserId,
        petId,
        serviceId,
        startDate,
        endDate,
        actualStartDate, // Начало первого события в серии
        actualEndDate, // Конец первого события в серии
        repetition, // Объект { type: 'daily', endDate: 'YYYY-MM-DD' } или null
        notes,
      } = req.body;
      const ownerUserId = req.user.id; // ID владельца из middleware аутентификации

      const isSingleBooking = startDate && endDate;
      const isSeriesBooking = actualStartDate && actualEndDate && repetition;

      // Простые проверки
      if (
        !sitterUserId ||
        !petId ||
        !serviceId ||
        (!isSingleBooking && !isSeriesBooking)
      ) {
        return next(
          ApiError.BadRequest(
            "Не все обязательные поля для бронирования предоставлены."
          )
        );
      }
      if (ownerUserId === sitterUserId) {
        return next(ApiError.BadRequest("Нельзя забронировать самого себя."));
      }
      // TODO: Добавить более строгую валидацию дат, ID и т.д.

      const bookingData = await bookingService.createBooking({
        ownerUserId,
        sitterUserId,
        petId,
        serviceId,
        startDate,
        endDate,
        actualStartDate,
        actualEndDate,
        repetition,
        notes,
      });

      return res.status(201).json(bookingData);
    } catch (error) {
      console.error("Ошибка в BookingController.createBooking:", error);
      if (error instanceof ApiError && error.status !== 500) {
        return next(error);
      }
      next(ApiError.InternalServerError("Ошибка при создании бронирования."));
    }
  }

  // Получить бронирования, где текущий пользователь - ВЛАДЕЛЕЦ
  async getMyBookingsAsOwner(req, res, next) {
    try {
      const userId = req.user?.id; // ID из authMiddleware
      if (!userId) {
        // Дублирование authMiddleware, но безопасно
        return next(ApiError.UnauthorizedError());
      }
      const bookings = await bookingService.findUserBookingsAsOwner(userId);
      return res.json(bookings); // Возвращаем массив бронирований
    } catch (error) {
      next(error); // Передаем ошибки дальше
    }
  }

  // Получить бронирования, где текущий пользователь - СИТТЕР
  async getMyBookingsAsSitter(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.UnauthorizedError());
      }
      const bookings = await bookingService.findUserBookingsAsSitter(userId);
      return res.json(bookings); // Возвращаем массив бронирований (может быть пустым)
    } catch (error) {
      next(error);
    }
  }

  async confirmBooking(req, res, next) {
    try {
      const bookingId = req.params.id; // ID из URL
      const userId = req.user.id; // ID ситтера из токена
      const updatedBooking = await bookingService.confirmBooking(
        bookingId,
        userId
      );
      return res.json(updatedBooking);
    } catch (error) {
      next(error);
    }
  }
  async declineBooking(req, res, next) {
    try {
      const bookingId = req.params.id;
      const userId = req.user.id; // ID ситтера
      const updatedBooking = await bookingService.declineBooking(
        bookingId,
        userId
      );
      return res.json(updatedBooking);
    } catch (error) {
      next(error);
    }
  }

  async cancelBookingAsOwner(req, res, next) {
    try {
      const bookingId = req.params.id;
      const userId = req.user.id; // ID владельца
      const updatedBooking = await bookingService.cancelBookingAsOwner(
        bookingId,
        userId
      );
      return res.json(updatedBooking);
    } catch (error) {
      next(error);
    }
  }

  async cancelBookingAsSitter(req, res, next) {
    try {
      const bookingId = req.params.id;
      const userId = req.user.id; // ID ситтера
      const { reason } = req.body; // Получаем причину из тела запроса

      if (!reason) {
        return next(ApiError.BadRequest("Не указана причина отмены."));
      }

      const updatedBooking = await bookingService.cancelBookingAsSitter(
        bookingId,
        userId,
        reason
      );
      return res.json(updatedBooking);
    } catch (error) {
      next(error);
    }
  }

  async completeBookingBySitter(req, res, next) {
    try {
      const bookingId = req.params.id;
      const userId = req.user.id; // ID ситтера
      const updatedBooking = await bookingService.completeBookingBySitter(
        bookingId,
        userId
      );
      return res.json(updatedBooking);
    } catch (error) {
      next(error);
    }
  }

  async downloadContract(req, res, next) {
    try {
      const bookingId = req.params.bookingId;
      const userId = req.user.id; // ID текущего пользователя

      const booking = await bookingService.getBookingForContractDownload(
        bookingId,
        userId
      );

      if (!booking || !booking.contract_path) {
        return next(
          ApiError.NotFound(
            "Договор не найден или у вас нет прав для его скачивания."
          )
        );
      }

      const filePath = path.join(
        __dirname,
        "..",
        "static",
        booking.contract_path
      );

      if (!fsSync.existsSync(filePath)) {
        // Используем синхронную проверку здесь, т.к. это уже в try/catch
        console.error(`Файл договора не найден на сервере: ${filePath}`);
        return next(ApiError.NotFound("Файл договора не найден на сервере."));
      }

      // Имя файла для пользователя
      const downloadFileName = `Договор_бронирования_${booking.id}.pdf`;
      res.download(filePath, downloadFileName, (err) => {
        if (err) {
          console.error("Ошибка при отправке файла договора:", err);
          if (!res.headersSent) {
            // next(ApiError.InternalServerError("Не удалось скачать договор."));
            // Вместо этого можно просто позволить Express обработать ошибку,
            // или убедиться, что статус ошибки установлен.
            // res.status(500).send({ message: "Не удалось скачать договор." });
            // Важно не вызывать next(err) если заголовки уже отправлены.
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BookingController();
