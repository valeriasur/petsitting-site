// controllers/search-controller.js
const searchService = require("../service/search-service"); // Импортируем наш сервис
const ApiError = require("../exceptions/api-error");

class SearchController {
  async getSitters(req, res, next) {
    try {
      console.log("Search request received. Query params:", req.query);

      // 1. Извлекаем и парсим параметры запроса
      const page = parseInt(req.query.page || "1", 10);
      const limit = parseInt(req.query.limit || "30", 10); // Лимит по умолчанию

      // Извлекаем остальные фильтры из req.query
      const {
        location,
        serviceType,
        startDate, // Пока не используется в сервисе
        endDate, // Пока не используется в сервисе
        max_price, // Имя параметра от фронта может быть maxPrice
        petSizes, // Ожидается как массив или строка, которую нужно будет распарсить? URLSearchParams обычно обрабатывает массивы
        petAgeCategory, // petAge от фронта
        // Булевы фильтры (могут приходить как 'true'/'false')
        sitterHasNoDogs,
        sitterHasNoCats,
        sitterHasNoOtherPets,
        sitterCanGiveMeds,
        sitterCanInject,
        sitterHasNoKids,
        sitterHasConstantSupervision,
        // Типы жилья (могут приходить как массив)
        housingTypes,
        sortBy, // Новый параметр сортировки
        min_rating, // Новый параметр минимального рейтинга
      } = req.query;

      // 2. Формируем объект filters для сервиса
      const filters = {};
      if (location) filters.location = location;
      if (serviceType) filters.serviceType = serviceType;
      // Преобразуем max_price в число (если пришло)
      if (max_price !== undefined) filters.max_price = parseInt(max_price, 10);
      // Обрабатываем массивы (URLSearchParams может передать как одну строку или несколько раз)
      // Если приходит один параметр с несколькими значениями, req.query[key] будет массивом
      // Если приходит несколько параметров с одним ключом, req.query[key] тоже будет массивом
      if (petSizes)
        filters.petSizes = Array.isArray(petSizes) ? petSizes : [petSizes];
      if (housingTypes)
        filters.housingTypes = Array.isArray(housingTypes)
          ? housingTypes
          : [housingTypes];
      console.log("Filters prepared for service:", filters);
      // Для одиночного выбора
      if (petAgeCategory) filters.petAgeCategory = petAgeCategory;

      // Преобразуем булевы строки 'true'/'false' в boolean
      const parseBoolean = (value) => value === "true";
      if (sitterHasNoDogs)
        filters.sitterHasNoDogs = parseBoolean(sitterHasNoDogs);
      if (sitterHasNoCats)
        filters.sitterHasNoCats = parseBoolean(sitterHasNoCats);
      if (sitterHasNoOtherPets)
        filters.sitterHasNoOtherPets = parseBoolean(sitterHasNoOtherPets);
      if (sitterCanGiveMeds)
        filters.sitterCanGiveMeds = parseBoolean(sitterCanGiveMeds);
      if (sitterCanInject)
        filters.sitterCanInject = parseBoolean(sitterCanInject);
      if (sitterHasNoKids)
        filters.sitterHasNoKids = parseBoolean(sitterHasNoKids);
      if (sitterHasConstantSupervision)
        filters.sitterHasConstantSupervision = parseBoolean(
          sitterHasConstantSupervision
        );
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      if (sortBy) filters.sortBy = sortBy;
      if (min_rating !== undefined) filters.min_rating = parseFloat(min_rating); // Преобразуем в число
      console.log("Filters prepared for service:", filters);

      // 3. Вызываем сервис для поиска
      const result = await searchService.findSitters(filters, page, limit);

      // 4. Отправляем результат клиенту
      res.json({
        sitters: result.sitters, // Массив найденных ситтеров
        total: result.total, // Общее количество найденных
        page: page,
        limit: limit,
        totalPages: Math.ceil(result.total / limit), // Общее количество страниц
      });
    } catch (error) {
      console.error("Ошибка в SearchController.getSitters:", error);
      next(error); // Передаем ошибку в middleware
    }
  }
}

module.exports = new SearchController();
