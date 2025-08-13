// router/index.js
const Router = require("express").Router;

// Контроллеры
const userController = require("../controllers/user-controller");
const sitterController = require("../controllers/sitter-controller");
const petController = require("../controllers/pet-controller");
const searchController = require("../controllers/search-controller");
const bookingController = require("../controllers/booking-controller");
const reviewController = require("../controllers/review-controller");

const availabilityController = require("../controllers/availability-controller");

const siteReviewController = require("../controllers/site-review-controller");

// Middleware
const authMiddleware = require("../middleware/auth-middleware");
const {
  uploadAvatar,
  uploadSitterFiles,
  uploadPetPhotos,
} = require("../middleware/upload-middleware");

// Создаем экземпляр роутера
const router = new Router();

// --- Маршруты Аутентификации и Регистрации ---
router.post("/registration", userController.registration); // Регистрация пользователя (отправляет письмо)
router.post("/login", userController.login); // Вход пользователя (проверяет активацию)
router.post("/logout", userController.logout); // Выход пользователя (очищает cookie, можно добавить удаление токена)
router.get("/activate/:token", userController.activate); // <-- НОВЫЙ Маршрут активации аккаунта по ссылке из email (GET-запрос)
router.post("/refresh", userController.refresh); // Обновление токенов (получает refreshToken из cookie)

// --- Маршруты Пользователя (требуют аутентификации) ---
router.get("/users", authMiddleware, userController.getUsers); // Получение списка пользователей (возможно, только для админа?)

router.get("/profile", authMiddleware, userController.getProfile); // Получение данных своего профиля
router.put(
  "/profile",
  authMiddleware,
  uploadAvatar,
  userController.updateProfile
); // Обновление своего профиля (включая аватар)
router.put("/change-password", authMiddleware, userController.changePassword); // Смена своего пароля
router.put("/change-email", authMiddleware, userController.changeEmail); // Смена своего email (с повторной верификацией)

router.get("/user", authMiddleware, userController.getUserData);

console.log("Тип sitterController:", typeof sitterController);
console.log("sitterController:", sitterController);
console.log(
  "Тип sitterController.submitAndVerifyRequest:",
  typeof sitterController.submitAndVerifyRequest
);
console.log(
  "sitterController.submitAndVerifyRequest:",
  sitterController.submitAndVerifyRequest
);

// --- Маршруты Ситтера (требуют аутентификации) ---
router.post(
  "/sitter-application",
  authMiddleware,
  uploadSitterFiles,
  sitterController.submitAndVerifyRequest
);

// --- Маршруты Питомцев (требуют аутентификации) ---
// router.post("/pets", authMiddleware, petController.createPet); // Добавление питомца
// router.put("/pets/:id", authMiddleware, petController.updatePet); // Обновление данных питомца
router.get("/pets/my", authMiddleware, petController.getMyPets); // Получение списка своих питомцев

router.post("/pets", authMiddleware, uploadPetPhotos, petController.createPet); // Добавлен uploadPetPhotos
router.put(
  "/pets/:id",
  authMiddleware,
  uploadPetPhotos,
  petController.updatePet
); // Добавлен uploadPetPhotos

// --- Публичные Маршруты (не требуют аутентификации) ---
router.get("/pet-types", petController.getAll); // Получение списка типов питомцев (для форм и т.д.)

// Добавьте маршруты поиска, если они есть
router.get("/sitters", searchController.getSitters);

// Новый маршрут для получения одного ситтера
router.get("/sitters/:userId", sitterController.getSitterById);

router.post("/bookings", authMiddleware, bookingController.createBooking);

// РОУТЫ ДЛЯ ПОЛУЧЕНИЯ БРОНИРОВАНИЙ
router.get(
  "/bookings/my-as-owner",
  authMiddleware,
  bookingController.getMyBookingsAsOwner
);

router.get(
  "/bookings/my-as-sitter",
  authMiddleware,
  bookingController.getMyBookingsAsSitter
);

router.put(
  "/bookings/:id/confirm",
  authMiddleware,
  bookingController.confirmBooking
);

router.put(
  "/bookings/:id/decline",
  authMiddleware,
  bookingController.declineBooking
); // Отклонение ситтером

router.put(
  "/bookings/:id/cancel-owner",
  authMiddleware,
  bookingController.cancelBookingAsOwner
); // Отмена владельцем

router.put(
  "/bookings/:id/cancel-sitter",
  authMiddleware,
  bookingController.cancelBookingAsSitter
); // Отмена ситтером

router.put(
  "/bookings/:id/complete-sitter",
  authMiddleware,
  bookingController.completeBookingBySitter
); // Завершение ситтером

router.post("/reviews", authMiddleware, reviewController.createReview); // отзывы
module.exports = router;

router.get(
  "/bookings/:bookingId/contract",
  authMiddleware,
  bookingController.downloadContract
);

router.get(
  "/sitters/:sitterUserId/availability-slots",
  availabilityController.getAvailabilitySlots
);

router.post("/site-reviews", siteReviewController.createSiteReview);
router.get("/site-reviews", siteReviewController.getPublishedSiteReviews);
