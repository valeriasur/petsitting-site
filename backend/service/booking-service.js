// backend/service/booking-service.js
const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const MailService = require("./mail-service");
const {
  Booking,
  User,
  Pet,
  Service,
  SitterProfile,
  SitterService,
  PetType,
  Review,
} = require("../models/index");

const ApiError = require("../exceptions/api-error");
const db = require("../db");
const PdfGeneratorService = require("./pdf-generator-service");

// ID ваших услуг из БД (важно, чтобы они были актуальны!)
const BOARDING_SERVICE_ID = 1; // "Передержка у ситтера дома"
const WALKING_SERVICE_ID = 2; // "Выгул питомца"
const HOUSESITTING_SERVICE_ID = 3; // "Визит няни на дом к клиенту"

class BookingService {
  async createBooking(bookingInput) {
    const {
      ownerUserId,
      sitterUserId,
      petId,
      serviceId,
      startDate, // Для одиночного или передержки
      endDate, // Для одиночного или передержки
      notes,
      actualStartDate, // Для серии
      actualEndDate, // Для серии
      repetition, // Для серии
    } = bookingInput;

    const t = await db.transaction();
    try {
      const owner = await User.findByPk(ownerUserId, { transaction: t });
      const sitter = await User.findOne({
        where: { id: sitterUserId, is_sitter: true },
        transaction: t,
      });
      const pet = await Pet.findOne({
        where: { id: petId, owner_user_id: ownerUserId },
        transaction: t,
      });
      const service = await Service.findByPk(serviceId, { transaction: t });

      if (!owner || !sitter || !pet || !service) {
        await t.rollback();
        throw ApiError.BadRequest(
          "Некорректные данные: пользователь, ситтер, питомец или услуга не найдены."
        );
      }

      const numericServiceId = Number(service.id);

      // --- ПРОВЕРКА НАЛИЧИЯ АДРЕСОВ В ЗАВИСИМОСТИ ОТ УСЛУГИ ---
      if (numericServiceId === BOARDING_SERVICE_ID) {
        if (!sitter.address_details) {
          await t.rollback();
          throw ApiError.BadRequest(
            "Ситтер не указал свой адрес в профиле. Бронирование услуги 'передержка на дому' невозможно."
          );
        }
        if (!owner.address_details) {
          await t.rollback();
          throw ApiError.BadRequest(
            "Пожалуйста, укажите ваш полный адрес в профиле для оформления бронирования."
          );
        }
      } else if (
        numericServiceId === WALKING_SERVICE_ID ||
        numericServiceId === HOUSESITTING_SERVICE_ID
      ) {
        if (!owner.address_details) {
          await t.rollback();
          throw ApiError.BadRequest(
            "Пожалуйста, укажите ваш полный адрес в профиле, так как услуга будет оказана у вас на дому."
          );
        }
      }
      // --- КОНЕЦ ПРОВЕРКИ АДРЕСОВ ---

      const sitterProfile = await SitterProfile.findOne({
        where: { user_id: sitterUserId },
        transaction: t,
      });

      if (!sitterProfile) {
        await t.rollback();
        throw ApiError.BadRequest(
          "Не найден профиль ситтера для расчета цены."
        );
      }

      const sitterServiceRecord = await SitterService.findOne({
        where: { sitter_profile_id: sitterProfile.id, service_id: service.id },
        transaction: t,
      });

      if (
        !sitterServiceRecord ||
        sitterServiceRecord.price === null ||
        sitterServiceRecord.price === undefined
      ) {
        await t.rollback();
        throw ApiError.BadRequest(
          "Ситтер не предоставляет эту услугу или цена не установлена."
        );
      }

      const pricePerUnit = parseFloat(sitterServiceRecord.price);
      const priceUnit = sitterServiceRecord.price_unit;

      if (isNaN(pricePerUnit)) {
        await t.rollback();
        throw ApiError.InternalServerError("Ошибка в цене услуги ситтера.");
      }

      // +++ ЛОГИКА ОБРАБОТКИ ОДИНОЧНЫХ И СЕРИЙНЫХ БРОНИРОВАНИЙ +++
      if (
        repetition &&
        repetition.type === "daily" &&
        repetition.endDate &&
        actualStartDate &&
        actualEndDate
      ) {
        // --- СОЗДАНИЕ СЕРИИ ЕЖЕДНЕВНЫХ БРОНИРОВАНИЙ ---
        if (numericServiceId === BOARDING_SERVICE_ID) {
          await t.rollback();
          throw ApiError.BadRequest(
            "Повторяющиеся бронирования не поддерживаются для услуги 'Передержка'."
          );
        }
        if (priceUnit !== "per_30_min") {
          await t.rollback();
          throw ApiError.BadRequest(
            "Повторяющиеся бронирования поддерживаются только для услуг с тарификацией за 30 минут."
          );
        }

        const seriesUUID = uuidv4();
        const createdBookingsInSeries = [];
        let aggregateSeriesPrice = 0;

        const firstOccurrenceStartObj = new Date(actualStartDate);
        const firstOccurrenceEndObj = new Date(actualEndDate);
        const durationMs =
          firstOccurrenceEndObj.getTime() - firstOccurrenceStartObj.getTime();

        if (durationMs <= 0) {
          await t.rollback();
          throw ApiError.BadRequest(
            "Некорректная длительность для события в серии."
          );
        }

        const [repEndYear, repEndMonth, repEndDay] = repetition.endDate
          .split("-")
          .map(Number);
        const repetitionEndDateObj = new Date(
          Date.UTC(repEndYear, repEndMonth - 1, repEndDay, 23, 59, 59, 999)
        );

        let currentDayIter = new Date(
          Date.UTC(
            firstOccurrenceStartObj.getUTCFullYear(),
            firstOccurrenceStartObj.getUTCMonth(),
            firstOccurrenceStartObj.getUTCDate()
          )
        );

        const startTimeHours = firstOccurrenceStartObj.getUTCHours();
        const startTimeMinutes = firstOccurrenceStartObj.getUTCMinutes();

        while (currentDayIter <= repetitionEndDateObj) {
          const occurrenceStart = new Date(currentDayIter);
          occurrenceStart.setUTCHours(startTimeHours, startTimeMinutes, 0, 0);
          const occurrenceEnd = new Date(
            occurrenceStart.getTime() + durationMs
          );

          const conflictingBooking = await Booking.findOne({
            where: {
              sitter_user_id: sitterUserId,
              status: {
                [Op.notIn]: [
                  "отмененный_владельцем",
                  "отмененный_работником",
                  "отклоненный",
                  "завершенный",
                ],
              },
              [Op.or]: [
                {
                  start_datetime: { [Op.lt]: occurrenceEnd },
                  end_datetime: { [Op.gt]: occurrenceStart },
                },
                {
                  start_datetime: {
                    [Op.gte]: occurrenceStart,
                    [Op.lt]: occurrenceEnd,
                  },
                },
                {
                  end_datetime: {
                    [Op.gt]: occurrenceStart,
                    [Op.lte]: occurrenceEnd,
                  },
                },
                {
                  start_datetime: { [Op.lte]: occurrenceStart },
                  end_datetime: { [Op.gte]: occurrenceEnd },
                },
              ],
            },
            transaction: t,
          });

          if (conflictingBooking) {
            await t.rollback();
            const conflictDateStr = occurrenceStart.toLocaleDateString(
              "ru-RU",
              { timeZone: "UTC" }
            );
            const conflictTimeStr = occurrenceStart.toLocaleTimeString(
              "ru-RU",
              { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }
            );
            throw ApiError.BadRequest(
              `Ситтер уже занят ${conflictDateStr} в ${conflictTimeStr}. Серия бронирований не создана.`
            );
          }

          const durationMinutes = durationMs / (1000 * 60);
          const numberOf30MinBlocks = durationMinutes / 30;
          const calculatedPriceForOccurrence =
            numberOf30MinBlocks * pricePerUnit;
          aggregateSeriesPrice += calculatedPriceForOccurrence;

          const newBooking = await Booking.create(
            {
              owner_user_id: ownerUserId,
              sitter_user_id: sitterUserId,
              pet_id: petId,
              service_id: service.id,
              start_datetime: occurrenceStart,
              end_datetime: occurrenceEnd,
              notes_for_sitter: notes,
              total_price: calculatedPriceForOccurrence.toFixed(2),
              status: "в ожидании",
              booking_series_id: seriesUUID,
            },
            { transaction: t }
          );
          createdBookingsInSeries.push(newBooking.get({ plain: true }));

          try {
            MailService.sendNewBookingNotification(
              sitter.email,
              owner.first_name,
              pet.name,
              service.description || service.name,
              occurrenceStart.toLocaleString("ru-RU", { timeZone: "UTC" }),
              occurrenceEnd.toLocaleString("ru-RU", { timeZone: "UTC" }),
              newBooking.id
            );
          } catch (mailError) {
            console.error(
              `Ошибка отправки email для бронирования ${newBooking.id} в серии:`,
              mailError
            );
          }

          currentDayIter.setUTCDate(currentDayIter.getUTCDate() + 1);
        }

        if (createdBookingsInSeries.length === 0) {
          await t.rollback();
          throw ApiError.BadRequest(
            "Не удалось создать ни одного бронирования в серии."
          );
        }

        await t.commit();
        return {
          message: `Серия из ${createdBookingsInSeries.length} бронирований успешно создана.`,
          seriesId: seriesUUID,
          totalSeriesPrice: aggregateSeriesPrice.toFixed(2),
        };
      } else if (startDate && endDate) {
        // --- СОЗДАНИЕ ОДИНОЧНОГО БРОНИРОВАНИЯ (включая передержку) ---
        const startObj = new Date(startDate);
        const endObj = new Date(endDate);

        const conflictingBooking = await Booking.findOne({
          where: {
            sitter_user_id: sitterUserId,
            status: {
              [Op.notIn]: [
                "отмененный_владельцем",
                "отмененный_работником",
                "отклоненный",
                "завершенный",
              ],
            },
            [Op.or]: [
              {
                start_datetime: { [Op.lt]: endObj },
                end_datetime: { [Op.gt]: startObj },
              },
              { start_datetime: { [Op.gte]: startObj, [Op.lt]: endObj } },
              { end_datetime: { [Op.gt]: startObj, [Op.lte]: endObj } },
              {
                start_datetime: { [Op.lte]: startObj },
                end_datetime: { [Op.gte]: endObj },
              },
            ],
          },
          transaction: t,
        });
        if (conflictingBooking) {
          await t.rollback();
          throw ApiError.BadRequest(
            "Ситтер уже занят на выбранные даты/время."
          );
        }

        let calculatedPrice;
        const diffTimeMs = Math.abs(endObj - startObj);

        if (priceUnit === "day") {
          let durationDays = Math.ceil(diffTimeMs / (1000 * 60 * 60 * 24));
          if (durationDays === 0 && diffTimeMs > 0) durationDays = 1;
          else if (
            durationDays === 0 &&
            diffTimeMs === 0 &&
            numericServiceId === BOARDING_SERVICE_ID
          )
            durationDays = 1;
          else if (durationDays === 0 && diffTimeMs === 0) {
            await t.rollback();
            throw ApiError.BadRequest(
              "Некорректная длительность бронирования (0)."
            );
          }
          calculatedPrice = durationDays * pricePerUnit;
        } else if (priceUnit === "per_30_min") {
          const durationMinutes = diffTimeMs / (1000 * 60);
          if (durationMinutes <= 0) {
            await t.rollback();
            throw ApiError.BadRequest(
              "Некорректная длительность бронирования."
            );
          }
          const numberOf30MinBlocks = durationMinutes / 30;
          calculatedPrice = numberOf30MinBlocks * pricePerUnit;
        } else {
          await t.rollback();
          throw ApiError.InternalServerError(
            "Не удалось рассчитать стоимость: неизвестная единица цены."
          );
        }

        if (isNaN(calculatedPrice) || calculatedPrice < 0) {
          await t.rollback();
          throw ApiError.InternalServerError(
            "Не удалось рассчитать корректную стоимость."
          );
        }

        const newBooking = await Booking.create(
          {
            owner_user_id: ownerUserId,
            sitter_user_id: sitterUserId,
            pet_id: petId,
            service_id: service.id,
            start_datetime: startDate,
            end_datetime: endDate,
            notes_for_sitter: notes,
            total_price: calculatedPrice.toFixed(2),
            status: "в ожидании",
          },
          { transaction: t }
        );

        try {
          MailService.sendNewBookingNotification(
            sitter.email,
            owner.first_name,
            pet.name,
            service.description || service.name,
            new Date(startDate).toLocaleString("ru-RU"),
            new Date(endDate).toLocaleString("ru-RU"),
            newBooking.id
          );
        } catch (mailError) {
          console.error(
            `Ошибка отправки уведомления о бронировании #${newBooking.id} на ${sitter.email}:`,
            mailError
          );
        }

        await t.commit();
        return newBooking.get({ plain: true });
      } else {
        await t.rollback();
        throw ApiError.BadRequest(
          "Некорректный набор параметров для создания бронирования."
        );
      }
    } catch (error) {
      if (t && t.finished !== "commit" && t.finished !== "rollback") {
        await t.rollback();
      }
      console.error(
        "Ошибка в BookingService.createBooking:",
        error.message,
        error.errors || error.original || error
      );
      if (error instanceof ApiError) throw error;
      throw ApiError.InternalServerError(
        "Внутренняя ошибка сервера при создании бронирования."
      );
    }
  }

  async findUserBookingsAsOwner(userId) {
    try {
      const bookings = await Booking.findAll({
        where: { owner_user_id: userId },
        include: [
          {
            model: User,
            as: "Sitter",
            attributes: [
              "id",
              "first_name",
              "last_name",
              "avatarURL",
              "phone",
              "address_details",
            ],
          },
          {
            model: User,
            as: "Owner",
            attributes: [
              "id",
              "first_name",
              "last_name",
              "avatarURL",
              "phone",
              "address_details",
            ],
          },
          {
            model: Pet,
            as: "Pet",
            include: [{ model: PetType, as: "PetType", attributes: ["name"] }],
          },
          {
            model: Service,
            as: "Service",
            attributes: ["id", "name", "description"],
          },
          { model: Review, as: "Review", attributes: ["id"], required: false },
        ],
        order: [["start_datetime", "DESC"]],
      });
      return bookings.map((b) => b.get({ plain: true }));
    } catch (error) {
      console.error("Ошибка получения бронирований (владелец):", error);
      throw ApiError.InternalServerError(
        "Не удалось получить список ваших заказов."
      );
    }
  }

  async findUserBookingsAsSitter(userId) {
    try {
      const user = await User.findByPk(userId, { attributes: ["is_sitter"] });
      if (!user || !user.is_sitter) return [];
      const bookings = await Booking.findAll({
        where: { sitter_user_id: userId },
        include: [
          {
            model: User,
            as: "Owner",
            attributes: [
              "id",
              "first_name",
              "last_name",
              "phone",
              "avatarURL",
              "address_details",
            ],
          },
          {
            model: User,
            as: "Sitter",
            attributes: [
              "id",
              "first_name",
              "last_name",
              "avatarURL",
              "phone",
              "address_details",
            ],
          },
          {
            model: Pet,
            as: "Pet",
            include: [{ model: PetType, as: "PetType", attributes: ["name"] }],
          },
          {
            model: Service,
            as: "Service",
            attributes: ["id", "name", "description"],
          },
          { model: Review, as: "Review", attributes: ["id"], required: false },
        ],
        order: [["start_datetime", "DESC"]],
      });
      return bookings.map((b) => b.get({ plain: true }));
    } catch (error) {
      console.error("Ошибка получения бронирований (ситтер):", error);
      throw ApiError.InternalServerError(
        "Не удалось получить список заказов у вас."
      );
    }
  }

  async confirmBooking(bookingId, sitterUserId) {
    const t = await db.transaction();
    try {
      const booking = await Booking.findOne({
        where: { id: bookingId, sitter_user_id: sitterUserId },
        include: [
          {
            model: User,
            as: "Owner",
            attributes: [
              "id",
              "email",
              "first_name",
              "last_name",
              "middle_name",
              "phone",
              "address_details",
              "confidant_first_name",
              "confidant_last_name",
              "confidant_middle_name",
              "confidant_phone",
            ],
          },
          {
            model: User,
            as: "Sitter",
            attributes: [
              "id",
              "email",
              "first_name",
              "last_name",
              "middle_name",
              "phone",
              "address_details",
            ],
            include: [
              {
                model: SitterProfile,
                as: "SitterProfile",
                attributes: ["id", "experience_years", "housing_type"],
                include: [
                  {
                    model: SitterService,
                    as: "OfferedServices",
                    attributes: ["id", "price", "price_unit", "service_id"],
                  },
                ],
              },
            ],
          },
          {
            model: Pet,
            as: "Pet",
            include: [{ model: PetType, as: "PetType", attributes: ["name"] }],
          },
          {
            model: Service,
            as: "Service",
            attributes: ["id", "name", "description"],
          },
        ],
        transaction: t,
      });

      if (!booking)
        throw ApiError.NotFound("Бронирование не найдено или у вас нет прав.");
      if (booking.status !== "в ожидании")
        throw ApiError.BadRequest(`Бронирование уже ${booking.status}.`);

      if (!booking.Owner?.address_details) {
        throw ApiError.BadRequest(
          "Владелец не указал свой адрес в профиле, договор не может быть сформирован."
        );
      }
      if (!booking.Sitter?.address_details) {
        throw ApiError.BadRequest(
          "Ситтер не указал свой адрес в профиле, договор не может быть сформирован."
        );
      }
      if (!booking.Owner?.first_name || !booking.Owner?.last_name) {
        throw ApiError.BadRequest(
          "Владелец не указал ФИО в профиле (данные для договора)."
        );
      }
      if (!booking.Sitter?.first_name || !booking.Sitter?.last_name) {
        throw ApiError.BadRequest(
          "Ситтер не указал ФИО в профиле (данные для договора)."
        );
      }
      if (Number(booking.service_id) === BOARDING_SERVICE_ID) {
        if (
          !booking.Owner?.confidant_first_name ||
          !booking.Owner?.confidant_last_name ||
          !booking.Owner?.confidant_phone
        ) {
          throw ApiError.BadRequest(
            "Для услуги 'передержка' необходимо указать данные доверенного лица в разделе 'Данные для договора'."
          );
        }
      }

      // TODO: Доработать генерацию контракта для серий
      const contractPath = await PdfGeneratorService.generateContract(
        booking.get({ plain: true })
      );

      if (!contractPath) {
        await t.rollback();
        throw ApiError.InternalServerError(
          "Не удалось сгенерировать путь к договору."
        );
      }

      // TODO: Если это серия (booking.booking_series_id), применить статус и контракт ко всем в серии
      booking.status = "подтвержденный";
      booking.contract_path = contractPath;
      await booking.save({ transaction: t });

      // TODO: Отправить уведомление владельцу о подтверждении (особенно если это серия)

      await t.commit();
      return booking.get({ plain: true });
    } catch (error) {
      if (t && t.finished !== "commit" && t.finished !== "rollback")
        await t.rollback();
      console.error("Ошибка подтверждения бронирования:", error);
      if (error instanceof ApiError) throw error;
      throw ApiError.InternalServerError(
        "Не удалось подтвердить бронирование."
      );
    }
  }

  async declineBooking(bookingId, sitterUserId) {
    const t = await db.transaction();
    try {
      const booking = await Booking.findOne({
        where: { id: bookingId, sitter_user_id: sitterUserId },
        include: [
          { model: User, as: "Owner", attributes: ["email", "first_name"] },
        ],
        transaction: t,
      });
      if (!booking)
        throw ApiError.NotFound("Бронирование не найдено или у вас нет прав.");
      if (booking.status !== "в ожидании")
        throw ApiError.BadRequest(
          "Отклонить можно только ожидающее бронирование."
        );

      // TODO: Если booking.booking_series_id, возможно, нужно отклонить всю серию.
      booking.status = "отклоненный";
      await booking.save({ transaction: t });
      try {
        MailService.sendBookingDeclinedNotification(
          booking.Owner.email,
          booking.Owner.first_name,
          booking.id
        );
      } catch (mailError) {
        console.error(
          `Не удалось отправить email об отклонении брони ${booking.id}:`,
          mailError
        );
      }
      await t.commit();
      return booking.get({ plain: true });
    } catch (error) {
      if (t && t.finished !== "commit" && t.finished !== "rollback")
        await t.rollback();
      console.error("Ошибка отклонения бронирования:", error);
      if (error instanceof ApiError) throw error;
      throw ApiError.InternalServerError("Не удалось отклонить бронирование.");
    }
  }

  async cancelBookingAsSitter(bookingId, sitterUserId, reason) {
    const t = await db.transaction();
    try {
      if (!reason || reason.trim() === "")
        throw ApiError.BadRequest("Необходимо указать причину отмены.");
      const booking = await Booking.findOne({
        where: { id: bookingId, sitter_user_id: sitterUserId },
        include: [
          { model: User, as: "Owner", attributes: ["email", "first_name"] },
        ],
        transaction: t,
      });
      if (!booking)
        throw ApiError.NotFound("Бронирование не найдено или у вас нет прав.");
      if (booking.status !== "подтвержденный")
        throw ApiError.BadRequest(
          "Отменить можно только подтвержденное бронирование."
        );

      // TODO: Если booking.booking_series_id, возможно, нужно отменить всю серию.
      booking.status = "отмененный_работником";
      booking.cancellation_reason = reason;
      await booking.save({ transaction: t });
      try {
        MailService.sendBookingCancelledBySitterNotification(
          booking.Owner.email,
          booking.Owner.first_name,
          booking.id,
          reason
        );
      } catch (mailError) {
        console.error(
          `Не удалось отправить email об отмене брони ${booking.id} ситтером:`,
          mailError
        );
      }
      await t.commit();
      return booking.get({ plain: true });
    } catch (error) {
      if (t && t.finished !== "commit" && t.finished !== "rollback")
        await t.rollback();
      console.error("Ошибка отмены бронирования ситтером:", error);
      if (error instanceof ApiError) throw error;
      throw ApiError.InternalServerError("Не удалось отменить бронирование.");
    }
  }

  async completeBookingBySitter(bookingId, sitterUserId) {
    const t = await db.transaction();
    try {
      const booking = await Booking.findOne({
        where: { id: bookingId, sitter_user_id: sitterUserId },
        transaction: t,
      });

      if (!booking) {
        if (t && !t.finished) await t.rollback();
        throw ApiError.NotFound("Бронирование не найдено или у вас нет прав.");
      }
      if (booking.status !== "подтвержденный") {
        if (t && !t.finished) await t.rollback();
        throw ApiError.BadRequest(
          "Завершить можно только подтвержденное бронирование."
        );
      }

      const now = new Date();
      const endDateDb = new Date(booking.end_datetime);

      if (now <= endDateDb) {
        if (t && !t.finished) await t.rollback();
        throw ApiError.BadRequest(
          "Бронирование еще не завершилось. Завершить можно только после наступления даты и времени окончания."
        );
      }

      booking.status = "завершенный";
      await booking.save({ transaction: t });
      await t.commit(); // Коммитим основное изменение

      // Запрашиваем обновленное бронирование с нужными связями
      const updatedBookingWithIncludes = await Booking.findByPk(bookingId, {
        include: [
          {
            model: User,
            as: "Owner",
            attributes: [
              "id",
              "first_name",
              "last_name",
              "phone",
              "avatarURL",
              "address_details",
            ],
          },
          {
            model: User,
            as: "Sitter",
            attributes: [
              "id",
              "first_name",
              "last_name",
              "avatarURL",
              "phone",
              "address_details",
            ],
          },
          {
            model: Pet,
            as: "Pet",
            include: [{ model: PetType, as: "PetType", attributes: ["name"] }],
          },
          {
            model: Service,
            as: "Service",
            attributes: ["id", "name", "description"],
          },
          { model: Review, as: "Review", attributes: ["id"], required: false },
        ],
      });

      if (!updatedBookingWithIncludes) {
        // Это маловероятно, но стоит обработать
        console.error(
          `Критическая ошибка: не удалось повторно найти бронирование ${bookingId} после обновления статуса на "завершенный".`
        );
        throw ApiError.InternalServerError(
          "Ошибка при получении обновленных данных бронирования после завершения."
        );
      }
      return updatedBookingWithIncludes.get({ plain: true });
    } catch (error) {
      if (t && t.finished !== "commit" && t.finished !== "rollback") {
        await t.rollback();
      }
      console.error("Ошибка завершения бронирования ситтером:", error);
      if (error instanceof ApiError) throw error;
      throw ApiError.InternalServerError("Не удалось завершить бронирование.");
    }
  }

  async cancelBookingAsOwner(bookingId, ownerUserId) {
    const t = await db.transaction();
    try {
      const booking = await Booking.findOne({
        where: { id: bookingId, owner_user_id: ownerUserId },
        include: [
          { model: User, as: "Sitter", attributes: ["email", "first_name"] },
        ],
        transaction: t,
      });
      if (!booking)
        throw ApiError.NotFound(
          "Бронирование не найдено или у вас нет прав на его отмену."
        );
      if (
        booking.status !== "в ожидании" &&
        booking.status !== "подтвержденный"
      ) {
        throw ApiError.BadRequest(
          `Нельзя отменить бронирование со статусом "${booking.status}".`
        );
      }

      // TODO: Если booking.booking_series_id, возможно, нужно отменить всю серию.
      booking.status = "отмененный_владельцем";
      await booking.save({ transaction: t });
      if (booking.Sitter && booking.Sitter.email) {
        try {
          MailService.sendBookingCancelledByOwnerNotification(
            booking.Sitter.email,
            booking.Sitter.first_name,
            booking.id
          );
        } catch (mailError) {
          console.error(
            `Не удалось отправить email-уведомление ситтеру об отмене бронирования ${booking.id} владельцем:`,
            mailError
          );
        }
      }
      await t.commit();
      return booking.get({ plain: true });
    } catch (error) {
      if (t && t.finished !== "commit" && t.finished !== "rollback")
        await t.rollback();
      console.error("Ошибка отмены бронирования владельцем:", error);
      if (error instanceof ApiError) throw error;
      throw ApiError.InternalServerError("Не удалось отменить бронирование.");
    }
  }

  async getBookingForContractDownload(bookingId, userId) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return null;
    }
    if (booking.owner_user_id !== userId && booking.sitter_user_id !== userId) {
      throw ApiError.Forbidden("У вас нет прав для доступа к этому договору.");
    }
    return booking.get({ plain: true });
  }
}
module.exports = new BookingService();
