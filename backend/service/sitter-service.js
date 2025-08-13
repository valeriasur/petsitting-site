// service/sitter-service.js
const { Op, Sequelize } = require("sequelize");
const path = require("path");
const db = require("../db");
const ApiError = require("../exceptions/api-error");

const {
  User,
  SitterProfile,
  SitterService,
  Service,
  Review,
  PetType,
  SitterPetPreference,
  Booking,
} = require("../models/index");

const petAgeMapping = {
  Молодые: "Молодые (до 1 года)",
  Взрослые: "Взрослые (1-10 лет)",
  Пожилые: "Пожилые (10+ лет)",
};

class SitterServiceLayer {
  async processApplication(
    userId,
    userEmail, // Можно удалить, если не используется
    profileDetailsFromForm, // Данные из формы анкеты ситтера
    servicesData,
    files
  ) {
    const t = await db.transaction();
    let sitterProfileInstance; // Для ID профиля в ответе
    try {
      console.log(
        `[SitterService] Starting application processing for user: ${userId}`
      );

      const acceptedPetTypeNames =
        profileDetailsFromForm.acceptedPetTypes || [];
      // Удаляем поля, которые не относятся напрямую к SitterProfile или будут обработаны отдельно
      const sitterProvidedAddress = profileDetailsFromForm.address_details; // Это адрес, который ситтер указал для оказания услуг

      // Формируем данные для SitterProfile, исключая address_details
      const sitterProfileDataForDB = { ...profileDetailsFromForm };
      delete sitterProfileDataForDB.acceptedPetTypes;
      delete sitterProfileDataForDB.address_details; // SitterProfile больше не хранит свой адрес

      let maxPetsCapacity = null;
      if (servicesData?.boarding?.enabled && servicesData.boarding.maxDogs) {
        const parsedCapacity = parseInt(servicesData.boarding.maxDogs, 10);
        if (!isNaN(parsedCapacity) && parsedCapacity >= 0) {
          maxPetsCapacity = parsedCapacity;
        }
      }
      // Удаляем maxDogs из servicesData перед циклом по услугам
      if (servicesData?.boarding) delete servicesData.boarding.maxDogs;

      let newSitterProfilePhotoPath = null;
      if (files?.profilePhoto?.[0]) {
        newSitterProfilePhotoPath =
          "/" +
          path
            .join("sitter_photos", files.profilePhoto[0].filename)
            .replace(/\\/g, "/");
        sitterProfileDataForDB.profile_photo_path = newSitterProfilePhotoPath;
      } else {
        const existingProfile = await SitterProfile.findOne({
          where: { user_id: userId },
          transaction: t,
          attributes: ["id"],
        });
        if (!existingProfile) {
          throw ApiError.BadRequest(
            "Фото профиля является обязательным при подаче заявки."
          );
        }
      }

      if (files?.apartmentPhotos?.length > 0) {
        sitterProfileDataForDB.housing_photo_paths = files.apartmentPhotos.map(
          (file) =>
            path.join("sitter_photos", file.filename).replace(/\\/g, "/")
        );
      } else {
        sitterProfileDataForDB.housing_photo_paths = [];
      }

      if (maxPetsCapacity !== null) {
        sitterProfileDataForDB.max_pets_capacity = maxPetsCapacity;
      }

      // Создание или Обновление SitterProfile (теперь без address_details)
      const [profileInstance, created] = await SitterProfile.upsert(
        { ...sitterProfileDataForDB, user_id: userId },
        { returning: true, transaction: t, conflictFields: ["user_id"] }
      );
      sitterProfileInstance = profileInstance; // Используем переименованную переменную
      console.log(
        `Профиль ситтера ${created ? "создан" : "обновлен"} с ID: ${
          sitterProfileInstance.id
        }`
      );

      // Обработка SitterService
      await SitterService.destroy({
        where: { sitter_profile_id: sitterProfileInstance.id },
        transaction: t,
      });
      const serviceCreationPromises = [];
      for (const serviceKey in servicesData) {
        const serviceInfo = servicesData[serviceKey];
        if (serviceInfo && serviceInfo.enabled) {
          const baseService = await Service.findOne({
            where: { name: serviceKey },
            transaction: t,
          });
          if (baseService) {
            let price = null;
            let price_unit = null;
            switch (serviceKey) {
              case "boarding":
                price_unit = "day";
                price = serviceInfo.ratePerDay; // Используем новое поле из SitterStep2Services
                break;
              case "walking":
                price_unit = "per_30_min";
                price = serviceInfo.ratePer30MinWalk; // Используем новое поле
                break;
              case "houseSitting":
                price_unit = "per_30_min";
                price = serviceInfo.ratePer30MinHouseSit; // Используем новое поле
                break;
              default:
                continue;
            }

            if (price !== undefined && price !== null && price_unit) {
              const numericPrice = parseFloat(String(price).replace(",", ".")); // Убедимся что строка и заменяем запятую, если есть
              if (!isNaN(numericPrice) && numericPrice >= 0) {
                const serviceDataToCreate = {
                  sitter_profile_id: sitterProfileInstance.id,
                  service_id: baseService.id,
                  price: numericPrice,
                  price_unit: price_unit,
                };
                serviceCreationPromises.push(
                  SitterService.create(serviceDataToCreate, { transaction: t })
                );
              } else {
                console.warn(
                  `[SitterService] Invalid price for ${serviceKey}: ${price}`
                );
              }
            }
          }
        }
      }

      if (serviceCreationPromises.length > 0)
        await Promise.all(serviceCreationPromises);

      // Обработка SitterPetPreference
      await SitterPetPreference.destroy({
        where: { sitter_profile_id: sitterProfileInstance.id },
        transaction: t,
      });
      if (acceptedPetTypeNames.length > 0) {
        const foundPetTypes = await PetType.findAll({
          where: { name: { [Op.in]: acceptedPetTypeNames } },
          attributes: ["id"],
          transaction: t,
        });
        if (foundPetTypes.length > 0) {
          const preferencesToCreate = foundPetTypes.map((pt) => ({
            sitter_profile_id: sitterProfileInstance.id,
            pet_type_id: pt.id,
          }));
          await SitterPetPreference.bulkCreate(preferencesToCreate, {
            transaction: t,
          });
        }
      }

      // Обновление Пользователя (User)
      const userUpdateData = { is_sitter: true };
      // Адрес, указанный в анкете ситтера, сохраняется в User.address_details
      if (sitterProvidedAddress && typeof sitterProvidedAddress === "string") {
        userUpdateData.address_details = sitterProvidedAddress;
        console.log(
          `[SitterService - processApplication] User.address_details for user ${userId} will be updated to: "${sitterProvidedAddress}"`
        );
      }
      if (newSitterProfilePhotoPath) {
        // Если новое фото профиля было загружено для SitterProfile
        userUpdateData.avatarURL = newSitterProfilePhotoPath; // Обновляем и основной аватар пользователя
      }
      await User.update(userUpdateData, {
        where: { id: userId },
        transaction: t,
      });
      console.log(
        `Пользователь user ID: ${userId} обновлен: ${JSON.stringify(
          userUpdateData
        )}`
      );

      await t.commit();
      return { success: true, profileId: sitterProfileInstance.id }; // Возвращаем ID профиля ситтера
    } catch (error) {
      console.error(
        "Произошла ошибка в SitterService.processApplication:",
        error
      );
      if (t && t.finished !== "commit" && t.finished !== "rollback") {
        try {
          await t.rollback();
        } catch (rbError) {
          console.error("CRITICAL: Error during rollback:", rbError);
        }
      }
      if (error instanceof ApiError) throw error;
      throw ApiError.InternalServerError(
        "Ошибка обработки заявки ситтера",
        error.message
      ); // Передаем сообщение ошибки
    }
  }

  async getSitterDetails(userId) {
    try {
      console.log(
        `[SitterService] Fetching sitter details for userId: ${userId}`
      );
      // SitterProfile больше не содержит address_details
      const profile = await SitterProfile.findOne({
        where: { user_id: userId },
        include: [
          {
            model: User,
            as: "UserAccount",
            required: true,
            where: { is_sitter: true },
            attributes: [
              "id",
              "first_name",
              "last_name",
              "address_details", // Адрес ситтера теперь здесь
              "avatarURL",
              "createdAt",
            ],
            include: [
              // SitterBookings теперь часть UserAccount
              {
                model: Booking,
                as: "SitterBookings",
                attributes: [
                  "id",
                  "start_datetime",
                  "end_datetime",
                  "status",
                  "service_id",
                ],
                required: false,
              },
            ],
          },
          {
            model: SitterService,
            as: "OfferedServices",
            required: false,
            attributes: [
              "id",
              "price",
              "price_unit", // price_unit теперь 'day' или 'per_30_min'
              "service_id",
            ],
            include: [
              {
                model: Service,
                as: "ServiceDetails",
                attributes: ["name", "description"],
              },
            ],
          },
        ],
      });

      if (!profile) {
        console.log(
          `[SitterService] Профиль ситтера для userId ${userId} не найден.`
        );
        return null;
      }

      // Отзывы о ситтере
      const reviewsAboutSitter = await Review.findAll({
        include: [
          {
            model: Booking,
            as: "Booking",
            attributes: [],
            where: { sitter_user_id: userId },
            required: true,
          },
          {
            model: User,
            as: "Reviewer",
            attributes: ["id", "first_name", "last_name", "avatarURL"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      const calculated_review_count = reviewsAboutSitter.length;
      let calculated_avg_rating = null;
      if (calculated_review_count > 0) {
        const sumOfRatings = reviewsAboutSitter.reduce(
          (sum, review) => sum + (parseFloat(review.rating) || 0),
          0
        );
        calculated_avg_rating = sumOfRatings / calculated_review_count;
      }

      const plainProfile = profile.get({ plain: true });
      const userAccountData = plainProfile.UserAccount || {};

      let displayAddressArea = "Местоположение не указано";
      // address_area формируется из UserAccount.address_details
      if (userAccountData.address_details) {
        const addressParts = userAccountData.address_details.split(",");
        const cityPart = addressParts[0]?.trim();
        let districtPart = "";
        if (addressParts.length > 1) {
          const districtLookup = addressParts.find((part) =>
            part.toLowerCase().includes("район")
          );
          if (districtLookup) districtPart = districtLookup.trim();
          else if (addressParts[1]) districtPart = addressParts[1].trim();
        }
        if (cityPart && districtPart)
          displayAddressArea = `${cityPart}, ${districtPart}`;
        else if (cityPart) displayAddressArea = cityPart;
      }

      const sitterData = {
        ...plainProfile, // Данные из SitterProfile (без address_details)
        UserAccount: {
          // Данные из User
          id: userAccountData.id,
          first_name: userAccountData.first_name,
          last_name: userAccountData.last_name,
          avatarURL: userAccountData.avatarURL,
          createdAt: userAccountData.createdAt,
          address_details: userAccountData.address_details, // Полный адрес ситтера (теперь из User)
          SitterBookings: userAccountData.SitterBookings || [], // Бронирования
        },
        OfferedServices: plainProfile.OfferedServices || [],
        avg_rating: calculated_avg_rating,
        review_count: calculated_review_count,
        Reviews: reviewsAboutSitter.map((r) => r.get({ plain: true })), // Отзывы О СИТТЕРЕ
        address_area: displayAddressArea,
      };

      // SitterProfile.address_details больше не существует, поэтому удалять его из sitterData не нужно
      // delete sitterData.address_details;

      console.log(
        `[SitterService] Данные для ситтера ${userId} успешно получены. Отзывов: ${sitterData.review_count}, Рейтинг: ${sitterData.avg_rating}.`
      );
      console.log(
        "[SitterService getSitterDetails] Final Sitter Data for Frontend:",
        JSON.stringify(sitterData, null, 2).substring(0, 1000)
      );
      return sitterData;
    } catch (error) {
      console.error(
        `[SitterService] Ошибка при получении деталей ситтера ${userId}:`,
        error
      );
      if (error.name && error.name.startsWith("Sequelize")) {
        console.error("Sequelize Error Name:", error.name);
        console.error("Sequelize Error Message:", error.message);
        if (error.sql) console.error("Sequelize Error SQL:", error.sql);
      }
      if (error.original) console.error("Original DB Error:", error.original);
      throw error;
    }
  }
}

module.exports = new SitterServiceLayer();
