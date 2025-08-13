// controllers/availability-controller.js
const availabilityService = require("../service/availability-service");
const ApiError = require("../exceptions/api-error");

class AvailabilityController {
  async getAvailabilitySlots(req, res, next) {
    try {
      const sitterUserIdFromParams = req.params.sitterUserId;
      // console.log("[AvailabilityController] req.params:", JSON.stringify(req.params));
      // console.log("[AvailabilityController] Extracted sitterUserIdFromParams:", sitterUserIdFromParams);

      const {
        date,
        serviceId,
        durationMinutes: durationMinutesString,
      } = req.query; // Получаем durationMinutes как строку
      // console.log("[AvailabilityController] req.query:", JSON.stringify(req.query));

      if (
        !sitterUserIdFromParams ||
        !date ||
        !serviceId ||
        !durationMinutesString
      ) {
        console.error("[AvailabilityController] Missing parameters:", {
          sitterUserIdFromParams,
          date,
          serviceId,
          durationMinutes: durationMinutesString,
        });
        return next(
          ApiError.BadRequest(
            "Не все параметры (sitterUserId, date, serviceId, durationMinutes) для получения слотов предоставлены."
          )
        );
      }

      const durationMinutes = parseInt(durationMinutesString, 10);
      if (isNaN(durationMinutes) || durationMinutes <= 0) {
        return next(
          ApiError.BadRequest("Некорректное значение durationMinutes.")
        );
      }

      const slots = await availabilityService.getAvailableTimeSlots({
        sitterUserId: sitterUserIdFromParams,
        date,
        serviceId: parseInt(serviceId, 10),
        durationMinutes: durationMinutes, // Передаем число
      });
      return res.json(slots);
    } catch (error) {
      console.error(
        "[AvailabilityController] Error in getAvailabilitySlots:",
        error
      );
      next(error);
    }
  }
}
module.exports = new AvailabilityController();
