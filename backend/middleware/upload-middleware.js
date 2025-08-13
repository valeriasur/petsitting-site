// backend/middleware/upload-middleware.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const uuid = require("uuid"); // Для имен аватаров

// --- ОБЩИЙ ФИЛЬТР ДЛЯ ИЗОБРАЖЕНИЙ (можно использовать для обоих) ---
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    console.log(
      `Фильтр: Файл ${file.originalname} (${file.mimetype}) разрешен.`
    );
    cb(null, true);
  } else {
    console.log(
      `Фильтр: Файл ${file.originalname} (${file.mimetype}) отклонен (не изображение).`
    );
    // Отклоняем файл без генерации ошибки, чтобы ее можно было обработать позже
    cb(null, false);
    // или cb(new Error('Разрешены только изображения!'));
  }
};

// --- КОНФИГУРАЦИЯ №1: ДЛЯ АВАТАРОВ ПОЛЬЗОВАТЕЛЕЙ ---
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Путь к папке аватаров внутри папки public (если она в корне проекта)
    const uploadPath = path.resolve(__dirname, "..", "public", "avatars");
    fs.mkdirSync(uploadPath, { recursive: true }); // Создаем, если нет
    console.log(`Сохранение аватара в: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = uuid.v4() + ext; // Уникальное имя для аватара
    console.log(`Имя файла аватара: ${filename}`);
    cb(null, filename);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFileFilter, // Используем общий фильтр
  limits: { fileSize: 5 * 1024 * 1024 }, // Лимит 5MB для аватара
}).single("avatar"); // Используем .single() для одного файла с полем 'avatar'

// --- КОНФИГУРАЦИЯ №2: ДЛЯ ФОТО СИТТЕРОВ (ПРОФИЛЬ И ЖИЛЬЕ) ---
const sitterStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Путь к папке фото ситтеров внутри папки uploads (если она в корне проекта)
    const uploadPath = path.join(__dirname, "..", "uploads", "sitter_photos");
    fs.mkdirSync(uploadPath, { recursive: true }); // Создаем, если нет
    console.log(`Сохранение фото ситтера в: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Имя включает userId и fieldname
    const userId = req.user ? req.user.id : "unknown"; // req.user должен быть!
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `${userId}-${file.fieldname}-${uniqueSuffix}${path.extname(
      file.originalname
    )}`;
    console.log(`Имя файла фото ситтера: ${filename}`);
    cb(null, filename);
  },
});

const uploadSitterFiles = multer({
  // Вы использовали имя uploadSitterFiles для этой middleware
  storage: sitterStorage,
  fileFilter: imageFileFilter, // Используем общий фильтр
  limits: { fileSize: 10 * 1024 * 1024 }, // Лимит 10MB для фото ситтера
}).fields([
  // Используем .fields() для разных полей
  { name: "profilePhoto", maxCount: 1 },
  { name: "apartmentPhotos", maxCount: 5 },
]);

// --- НОВАЯ КОНФИГУРАЦИЯ №3: ДЛЯ ФОТО ПИТОМЦЕВ (ЭТО МЫ ДОБАВЛЯЕМ) ---
// *******************************************************************
const petPhotosStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "..", "uploads", "pet_photos");
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log(`Сохранение фото питомца в: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const userId = req.user ? req.user.id : "unknown_owner";
    const petId = req.params.petId || req.params.id || "new_pet";
    const uniqueSuffix = uuid.v4();
    const originalNameWithoutExt = path.parse(file.originalname).name;
    const sanitizedOriginalName = originalNameWithoutExt.replace(
      /[^a-zA-Z0-9-_]/g,
      ""
    );
    const filename = `${userId}-${petId}-${sanitizedOriginalName}-${uniqueSuffix}${path.extname(
      file.originalname
    )}`;
    console.log(`Имя файла фото питомца: ${filename}`);
    cb(null, filename);
  },
});

const uploadPetPhotos = multer({
  storage: petPhotosStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("petPhoto"); // Для нескольких фото питомца (до 5) с именем поля "petPhotos"
// Если нужна только ОДНА фотография, используйте: .single("petPhoto")
// *******************************************************************
// --- КОНЕЦ НОВОЙ КОНФИГУРАЦИИ ---
// *******************************************************************

// --- ЭКСПОРТ ВСЕХ MIDDLEWARE-ФУНКЦИЙ (ДОБАВЛЯЕМ НОВУЮ) ---
module.exports = {
  uploadAvatar,
  uploadSitterFiles,
  uploadPetPhotos, // <--- ДОБАВИЛИ В ЭКСПОРТ
};
