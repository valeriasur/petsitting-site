// service/search-service.js
const { Op, Sequelize, literal } = require("sequelize");
const {
  User,
  SitterProfile,
  SitterService,
  Service,
  Review,
  Booking,
} = require("../models/index");
const ApiError = require("../exceptions/api-error");

const MAX_PRICE_VALUE = 5000;

const petAgeMapping = {
  Молодые: "Молодые (до 1 года)",
  Взрослые: "Взрослые (1-10 лет)",
  Пожилые: "Пожилые (10+ лет)",
};

// Полный список стоп-слов для адреса (можете дополнить/изменить)
const stopWordsAddressDefault = [
  "г",
  "город",
  "ул",
  "улица",
  "пр",
  "проспект",
  "пер",
  "переулок",
  "б-р",
  "бульвар",
  "ш",
  "шоссе",
  "пл",
  "площадь",
  "наб",
  "набережная",
  "д",
  "дом",
  "к",
  "корп",
  "корпус",
  "стр",
  "строение",
  "лит",
  "литера",
  "р-н",
  "район",
  "обл",
  "область",
  "мкр",
  "микрорайон",
  "кв",
  "квартира",
  "пос",
  "поселок",
  "село",
  "деревня",
  "проезд",
  "тупик",
  "аллея",
  "тракт",
  "снт",
  "тер",
  "территория",
];

class SitterServiceLayer {
  // ЗАМЕНИТЕ ВЕСЬ МЕТОД findSitters В ФАЙЛЕ backend/service/search-service.js НА ЭТОТ КОД

  async findSitters(filters, page, limit) {
    console.log(
      "[SearchService] Received filters:",
      JSON.stringify(filters, null, 2)
    );
    try {
      const offset = (page - 1) * limit;
      const whereUser = {};
      const whereProfile = {};
      const whereSitterService = {};

      whereUser.is_email_verified = true;
      whereUser.is_sitter = true;

      if (filters.location && filters.location.trim() !== "") {
        const originalLocationQuery = filters.location.trim();
        let locationQueryNormalized = originalLocationQuery
          .replace(/-/g, " ")
          .toLowerCase();
        const buildingNumbers = (
          locationQueryNormalized.match(/\b\d+[а-яёa-z]*\b/gi) || []
        ).map((n) => n.toLowerCase());
        let wordsOnlyQuery = locationQueryNormalized;
        if (buildingNumbers.length > 0) {
          buildingNumbers.forEach((num) => {
            wordsOnlyQuery = wordsOnlyQuery.replace(
              new RegExp(`\\b${num}\\b`, "gi"),
              ""
            );
          });
        }
        let significantWords = wordsOnlyQuery
          .replace(/[.,/#!$%^&*;:{}=`~()]/g, " ")
          .split(/\s+/)
          .map((term) => term.trim())
          .filter(
            (term) =>
              term &&
              (term.length > 2 || /\d/.test(term)) &&
              !stopWordsAddressDefault.includes(term)
          )
          .filter(Boolean);
        const uniqueBuildingNumbers = [
          ...new Set(buildingNumbers.filter(Boolean)),
        ];
        let searchTerms = [
          ...new Set([...significantWords, ...uniqueBuildingNumbers]),
        ].filter(Boolean);

        if (searchTerms.length > 0) {
          const addressConditions = searchTerms.map((term) => ({
            address_details: { [Op.iLike]: `%${term}%` },
          }));
          whereUser[Op.and] = (whereUser[Op.and] || []).concat(
            addressConditions
          );
        } else if (originalLocationQuery) {
          whereUser.address_details = {
            [Op.iLike]: `%${originalLocationQuery}%`,
          };
        }
      }

      if (filters.petSizes?.length)
        whereProfile.accepted_sizes = {
          [Op.overlap]: [...filters.petSizes, "Любой"],
        };
      if (filters.petAgeCategory && petAgeMapping[filters.petAgeCategory])
        whereProfile.accepted_ages = {
          [Op.overlap]: [petAgeMapping[filters.petAgeCategory]],
        };
      if (filters.housingTypes?.length)
        whereProfile.housing_type = { [Op.in]: filters.housingTypes };
      if (filters.sitterHasNoDogs === true) whereProfile.has_own_dogs = false;
      if (filters.sitterHasNoCats === true) whereProfile.has_own_cats = false;
      if (filters.sitterHasNoOtherPets === true)
        whereProfile.has_other_pets = false;
      if (filters.sitterCanGiveMeds === true)
        whereProfile.can_administer_meds = true;
      if (filters.sitterCanInject === true)
        whereProfile.can_give_injections = true;
      if (filters.sitterHasNoKids === true)
        whereProfile.has_children_under_10 = false;
      if (filters.sitterHasConstantSupervision === true)
        whereProfile.has_constant_supervision = true;

      let serviceId = null;
      if (filters.serviceType && filters.serviceType.trim() !== "") {
        const service = await Service.findOne({
          where: { name: filters.serviceType.trim() },
          attributes: ["id"],
          raw: true,
        });
        if (service) {
          serviceId = service.id;
          whereSitterService.service_id = serviceId;
        } else {
          return { sitters: [], total: 0 };
        }
      }
      if (
        filters.max_price !== undefined &&
        !isNaN(filters.max_price) &&
        filters.max_price < MAX_PRICE_VALUE
      ) {
        whereSitterService.price = { [Op.lte]: filters.max_price };
      }

      // --- ТОЧЕЧНОЕ ИЗМЕНЕНИЕ ЗДЕСЬ ---
      // Мы заранее готовим список ID занятых ситтеров
      let busySitterIds = [];
      if (filters.startDate) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRegex.test(filters.startDate)) {
          const filterStartDateStr = filters.startDate;
          let filterEndDateStr =
            filters.endDate && dateRegex.test(filters.endDate)
              ? filters.endDate
              : filters.startDate;

          const filterEndDateExclusive = new Date(filterEndDateStr);
          filterEndDateExclusive.setDate(filterEndDateExclusive.getDate() + 1);
          const filterEndDateExclusiveStr = filterEndDateExclusive
            .toISOString()
            .split("T")[0];

          const activeBookingStatuses = ["в ожидании", "подтвержденный"];
          const BOARDING_SERVICE_ID = 1;

          const whereBooking = {
            status: { [Op.in]: activeBookingStatuses },
            start_datetime: { [Op.lt]: filterEndDateExclusiveStr },
            end_datetime: { [Op.gt]: filterStartDateStr },
          };

          if (serviceId && serviceId !== BOARDING_SERVICE_ID) {
            whereBooking.service_id = BOARDING_SERVICE_ID;
          }

          const busyBookings = await Booking.findAll({
            where: whereBooking,
            attributes: [
              [
                Sequelize.fn("DISTINCT", Sequelize.col("sitter_user_id")),
                "sitter_user_id",
              ],
            ],
            raw: true,
          });
          busySitterIds = busyBookings.map((b) => b.sitter_user_id);
        }
      }
      // И добавляем это условие в whereUser
      if (busySitterIds.length > 0) {
        whereUser.id = { [Op.notIn]: busySitterIds };
      }
      // --- КОНЕЦ ТОЧЕЧНОГО ИЗМЕНЕНИЯ ---

      const order = [];
      let havingClause = null;
      const calculatedRatingAttributes = [
        [
          Sequelize.fn(
            "COALESCE",
            Sequelize.fn(
              "AVG",
              Sequelize.col('"UserAccount->SitterBookings->Review"."rating"')
            ),
            0
          ),
          "avg_rating_calculated",
        ],
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.col('"UserAccount->SitterBookings->Review"."id"')
          ),
          "review_count_calculated",
        ],
      ];

      if (filters.min_rating !== undefined && filters.min_rating > 0) {
        havingClause = Sequelize.literal(
          `COALESCE(AVG("UserAccount->SitterBookings->Review"."rating"), 0) >= ${filters.min_rating}`
        );
      }

      if (filters.sortBy) {
        switch (filters.sortBy) {
          case "price_asc":
            order.push([
              Sequelize.col('"OfferedServices"."price"'),
              "ASC NULLS LAST",
            ]);
            break;
          case "price_desc":
            order.push([
              Sequelize.col('"OfferedServices"."price"'),
              "DESC NULLS LAST",
            ]);
            break;
          case "rating_desc":
            order.push([
              Sequelize.literal("avg_rating_calculated"),
              "DESC NULLS LAST",
            ]);
            break;
          default:
            order.push([Sequelize.col('"SitterProfile"."id"'), "ASC"]);
        }
      } else {
        order.push([Sequelize.col('"SitterProfile"."id"'), "ASC"]);
      }

      const queryOptions = {
        where: whereProfile,
        attributes: {
          include: calculatedRatingAttributes,
        },
        include: [
          {
            model: User,
            as: "UserAccount",
            where: whereUser, // <-- Сюда добавилось условие notIn
            required: true,
            attributes: [
              "id",
              "first_name",
              "last_name",
              "address_details",
              "avatarURL",
            ],
            include: [
              {
                model: Booking,
                as: "SitterBookings",
                attributes: [],
                required: false,
                include: [
                  {
                    model: Review,
                    as: "Review",
                    attributes: [],
                    required: false,
                  },
                ],
              },
            ],
          },
          {
            model: SitterService,
            as: "OfferedServices",
            where: whereSitterService,
            required: !!(
              serviceId ||
              (Object.keys(whereSitterService).length > 0 &&
                whereSitterService.price)
            ),
            attributes: ["id", "price", "price_unit", "service_id"],
          },
        ],
        order: order,
        limit: limit,
        offset: offset,
        group: [
          "SitterProfile.id",
          "UserAccount.id",
          ...(serviceId ||
          (Object.keys(whereSitterService).length > 0 &&
            whereSitterService.price)
            ? [Sequelize.col('"OfferedServices"."id"')]
            : []),
        ],
        having: havingClause,
        subQuery: false,
        logging: (sql) => {
          console.log("[SearchService SQL]", sql.replace(/\s\s+/g, " "));
        },
      };

      if (!queryOptions.having) {
        delete queryOptions.having;
      }

      const isOfferedServicesRequired = !!(
        serviceId ||
        (Object.keys(whereSitterService).length > 0 && whereSitterService.price)
      );
      if (
        !whereSitterService.service_id &&
        filters.sortBy !== "price_asc" &&
        filters.sortBy !== "price_desc" &&
        !isOfferedServicesRequired
      ) {
        const offeredServicesGroupIndex = queryOptions.group.findIndex(
          (item) =>
            typeof item === "object" && item.col === '"OfferedServices"."id"'
        );
        if (offeredServicesGroupIndex > -1) {
          queryOptions.group.splice(offeredServicesGroupIndex, 1);
        }
      }

      const result = await SitterProfile.findAndCountAll(queryOptions);
      const totalCount = Array.isArray(result.count)
        ? result.count.length
        : result.count;
      const rows = result.rows;

      console.log(
        `[SearchService] Query result - Total SitterProfiles: ${totalCount}, Rows on page: ${rows.length}`
      );

      if (rows.length === 0) {
        return { sitters: [], total: totalCount };
      }

      const sittersWithStats = rows.map((profile) => {
        const plainProfile = profile.get({ plain: true });
        const userAccountData = plainProfile.UserAccount || {};

        let displayCity = "Город не указан";
        if (userAccountData.address_details) {
          const parts = userAccountData.address_details.split(",");
          if (parts.length > 0) displayCity = parts[0].trim();
        }

        let offeredServicesData = [];
        if (plainProfile.OfferedServices) {
          offeredServicesData = Array.isArray(plainProfile.OfferedServices)
            ? plainProfile.OfferedServices
            : [plainProfile.OfferedServices];
        }

        return {
          user_id: userAccountData.id,
          profile_photo_path:
            plainProfile.profile_photo_path || userAccountData.avatarURL,
          bio: plainProfile.bio,
          UserAccount: {
            id: userAccountData.id,
            first_name: userAccountData.first_name,
            last_name: userAccountData.last_name,
            city: displayCity,
          },
          OfferedServices: offeredServicesData,
          review_count: parseInt(plainProfile.review_count_calculated, 10) || 0,
          avg_rating:
            plainProfile.avg_rating_calculated !== undefined
              ? parseFloat(plainProfile.avg_rating_calculated)
              : null,
        };
      });

      return { sitters: sittersWithStats, total: totalCount };
    } catch (error) {
      console.error("[SearchService] Error in findSitters:", error);
      if (error.name && error.name.startsWith("Sequelize")) {
        console.error("Sequelize Error Name:", error.name);
        console.error("Sequelize Error Message:", error.message);
        if (error.sql) console.error("Sequelize Error SQL:", error.sql);
      }
      if (error.original) console.error("Original DB Error:", error.original);
      throw ApiError.InternalServerError(
        "Ошибка при поиске догситтеров",
        error
      );
    }
  }

  async getSitterDetails(userId) {
    try {
      console.log(
        `[SitterService] Fetching sitter details for userId: ${userId}`
      );
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
              "address_details",
              "avatarURL",
              "createdAt",
            ],
            include: [
              {
                model: Booking,
                as: "SitterBookings", // Убедитесь, что этот alias соответствует User.associate
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
              "price_unit",
              "service_id",
              "price_extra_half_hour",
              "price_hour",
              "price_extra_hour",
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
      if (plainProfile.address_details) {
        const addressParts = plainProfile.address_details.split(",");
        const cityPart = addressParts[0]?.trim();
        let districtPart = "";
        if (addressParts.length > 1) {
          const districtLookup = addressParts.find((part) =>
            part.toLowerCase().includes("район")
          );
          if (districtLookup) districtPart = districtLookup.trim();
          else if (addressParts.length > 1 && addressParts[1])
            districtPart = addressParts[1].trim();
        }
        if (cityPart && districtPart)
          displayAddressArea = `${cityPart}, ${districtPart}`;
        else if (cityPart) displayAddressArea = cityPart;
      }

      const sitterData = {
        ...plainProfile,
        UserAccount: {
          id: userAccountData.id,
          first_name: userAccountData.first_name,
          last_name: userAccountData.last_name,
          avatarURL: userAccountData.avatarURL,
          createdAt: userAccountData.createdAt,
          address_details: userAccountData.address_details,
          SitterBookings: userAccountData.SitterBookings || [],
        },
        OfferedServices: plainProfile.OfferedServices || [],
        avg_rating: calculated_avg_rating,
        review_count: calculated_review_count,
        Reviews: reviewsAboutSitter.map((r) => r.get({ plain: true })),
        address_area: displayAddressArea,
      };

      console.log(
        `[SitterService] Данные для ситтера ${userId} успешно получены. Отзывов: ${sitterData.review_count}, Рейтинг: ${sitterData.avg_rating}.`
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
