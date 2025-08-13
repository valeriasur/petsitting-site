// service/availability-service.js
const { Op } = require("sequelize"); // Убедитесь, что Op импортирован
const { Booking, User, Service } = require("../models/index");
const ApiError = require("../exceptions/api-error");

// Убедитесь, что эти ID соответствуют вашей БД
const BOARDING_SERVICE_ID = 1;
const WALKING_SERVICE_ID = 2;
const HOUSESITTING_SERVICE_ID = 3;
const BUFFER_MINUTES = 60; // 1 час буфера до и после

class AvailabilityService {
  async getAvailableTimeSlots({
    sitterUserId,
    date,
    serviceId,
    durationMinutes,
  }) {
    console.log(
      // Лог для проверки входящих параметров
      `[AvailService] Params: sitterUserId=${sitterUserId}, date=${date}, serviceId=${serviceId}, durationMinutes=${durationMinutes}`
    );

    // 1. Проверка существования ситтера и услуги (оставляем как есть)
    const sitter = await User.findOne({
      where: { id: sitterUserId, is_sitter: true },
    });
    if (!sitter) throw ApiError.NotFound("Ситтер не найден");
    const service = await Service.findByPk(serviceId);
    if (!service) throw ApiError.NotFound("Услуга не найдена");

    const workDayStartHour = 8;
    const workDayEndHour = 22;

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const dayStart = new Date(targetDate);
    dayStart.setHours(workDayStartHour, 0, 0, 0);

    const dayEndBoundary = new Date(targetDate);
    dayEndBoundary.setHours(workDayEndHour, 0, 0, 0);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookings = await Booking.findAll({
      where: {
        sitter_user_id: sitterUserId,
        status: {
          [Op.notIn]: [
            "отмененный_владельцем",
            "отмененный_работником",
            "отклоненный",
          ],
        },
        [Op.and]: [
          { start_datetime: { [Op.lt]: endOfDay } },
          { end_datetime: { [Op.gt]: startOfDay } },
        ],
      },
      attributes: ["start_datetime", "end_datetime", "service_id"],
    });
    console.log(
      `[AvailService] Date: ${date}, Existing Bookings:`,
      JSON.stringify(existingBookings, null, 2)
    );

    const availableSlots = [];
    const slotIncrementMinutes = 30;

    for (let currentTime = new Date(dayStart); ; ) {
      const potentialSlotStart = new Date(currentTime);
      const potentialSlotEnd = new Date(potentialSlotStart);
      potentialSlotEnd.setMinutes(
        potentialSlotEnd.getMinutes() + durationMinutes
      );

      // УДАЛИТЕ ЭТИ ДВЕ СТРОКИ - ОНИ ЗДЕСЬ НЕ НУЖНЫ И ВЫЗЫВАЮТ ОШИБКУ
      // let effectiveBookingStart = new Date(bookingStart);
      // let effectiveBookingEnd = new Date(bookingEnd);

      if (potentialSlotEnd > dayEndBoundary) {
        console.log(
          // Лог для отладки выхода из цикла
          `[AvailService] Slot ${potentialSlotStart.toLocaleTimeString()}-${potentialSlotEnd.toLocaleTimeString()} ends after boundary ${dayEndBoundary.toLocaleTimeString()}. Breaking.`
        );
        break;
      }

      let isSlotFree = true;
      console.log(
        // Лог для каждого проверяемого слота
        `[AvailService] Checking potential slot: ${potentialSlotStart.toLocaleTimeString()} - ${potentialSlotEnd.toLocaleTimeString()}`
      );

      for (const booking of existingBookings) {
        // effectiveBookingStart и effectiveBookingEnd должны быть здесь, внутри этого цикла
        let effectiveBookingStart = new Date(booking.start_datetime);
        let effectiveBookingEnd = new Date(booking.end_datetime);
        const existingBookingServiceId = Number(booking.service_id);

        console.log(
          // Лог для каждого существующего бронирования
          `  Comparing with existing booking ID ${existingBookingServiceId}: ${effectiveBookingStart.toLocaleTimeString()} - ${effectiveBookingEnd.toLocaleTimeString()}`
        );

        if (
          existingBookingServiceId === WALKING_SERVICE_ID ||
          existingBookingServiceId === HOUSESITTING_SERVICE_ID
        ) {
          effectiveBookingStart.setMinutes(
            effectiveBookingStart.getMinutes() - BUFFER_MINUTES
          );
          effectiveBookingEnd.setMinutes(
            effectiveBookingEnd.getMinutes() + BUFFER_MINUTES
          );
          console.log(
            // Лог для буферного времени
            `    Effective time with buffer for existing booking: ${effectiveBookingStart.toLocaleTimeString()} - ${effectiveBookingEnd.toLocaleTimeString()}`
          );
        }

        if (
          potentialSlotStart < effectiveBookingEnd &&
          potentialSlotEnd > effectiveBookingStart
        ) {
          console.log(
            `    Intersection detected with existing booking (serviceId: ${existingBookingServiceId})`
          ); // Лог пересечения

          // --- Ваша логика определения конфликта ---
          if (
            existingBookingServiceId === BOARDING_SERVICE_ID &&
            (serviceId === WALKING_SERVICE_ID ||
              serviceId === HOUSESITTING_SERVICE_ID)
          ) {
            console.log("      Conflict: Boarding blocks Walk/Housesit.");
            isSlotFree = false;
            break;
          }
          if (serviceId === BOARDING_SERVICE_ID) {
            console.log(
              "      Conflict: Trying to book Boarding, but sitter is busy."
            );
            isSlotFree = false;
            break;
          }
          if (
            (serviceId === WALKING_SERVICE_ID ||
              serviceId === HOUSESITTING_SERVICE_ID) &&
            (existingBookingServiceId === WALKING_SERVICE_ID ||
              existingBookingServiceId === HOUSESITTING_SERVICE_ID)
          ) {
            console.log(
              "      Conflict: Walk/Housesit overlaps with another Walk/Housesit (considering buffer)."
            );
            isSlotFree = false;
            break;
          }
        }
      }

      if (isSlotFree) {
        const hours = potentialSlotStart.getHours().toString().padStart(2, "0");
        const minutes = potentialSlotStart
          .getMinutes()
          .toString()
          .padStart(2, "0");
        availableSlots.push(`${hours}:${minutes}`);
        console.log(`  Slot ${hours}:${minutes} is FREE.`);
      } else {
        console.log(
          `  Slot ${potentialSlotStart.toLocaleTimeString()} is BOOKED.`
        );
      }

      currentTime.setMinutes(currentTime.getMinutes() + slotIncrementMinutes);
      if (currentTime >= dayEndBoundary && slotIncrementMinutes > 0) {
        console.log(
          `[AvailService] Reached or passed dayEndBoundary with currentTime. Breaking.`
        );
        break;
      }
      if (slotIncrementMinutes <= 0) {
        console.error(
          "[AvailService] slotIncrementMinutes is 0 or negative. Breaking."
        );
        break;
      }
    }
    console.log(`[AvailService] Generated slots for ${date}:`, availableSlots);
    return availableSlots;
  }
}
module.exports = new AvailabilityService();
