const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const router = require("./router/index");
const sequelize = require("./db");
const path = require("path");

// Импорт моделей
const User = require("./models/user-model");
const Pet = require("./models/pet-model");
const PetType = require("./models/pet-type-model");
const SitterProfile = require("./models/sitter-profile-model");
const Service = require("./models/service-model");
const SitterService = require("./models/sitter-service-model");
const SitterPetPreference = require("./models/sitter-pet-preference-model");
const Booking = require("./models/booking-model");
const Review = require("./models/review-model");
const Token = require("./models/token-model");
const SiteReview = require("./models/site-review-model");
// Формирование объекта моделей
const models = {
  User,
  Pet,
  PetType,
  SitterProfile,
  Service,
  SitterService,
  SitterPetPreference,
  Booking,
  Review,
  Token,
  SiteReview,
};

const PORT = process.env.PORT || 5000;
const app = express();

const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.use(cookieParser());

// настройка раздачи статических файлов
app.use("/avatars", express.static(path.join(__dirname, "public", "avatars")));

app.use(
  "/sitter_photos",
  express.static(path.join(__dirname, "uploads", "sitter_photos"))
);

app.use(
  "/pet_photos",
  express.static(path.join(__dirname, "uploads", "pet_photos"))
);

app.use("/api", router);

const checkDbConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Подключение к PostgreSQL установлено!");
  } catch (err) {
    console.error("❌ Ошибка подключения к PostgreSQL:", err);
    process.exit(1);
  }
};

const start = async () => {
  try {
    await checkDbConnection();

    console.log("\nПроверка регистрации моделей:");
    console.log("Зарегистрированные модели:", Object.keys(sequelize.models));

    if (sequelize.models.Pet) {
      console.log("✅ Pet model exists:", sequelize.models.Pet);
    } else {
      console.error("❌ Pet model is missing!");
      throw new Error("Pet model not registered");
    }

    await sequelize.sync({ alter: true });
    console.log("Проверка модели Pet:");
    console.log("Pet.create exists:", typeof Pet.create === "function");
    console.log("Pet.sequelize:", Pet.sequelize !== undefined);

    await sequelize.sync({ alter: true });
    console.log("База данных синхронизирована");

    app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));
  } catch (e) {
    console.error("❌ Ошибка запуска сервера:", e);
    process.exit(1);
  }
};

start();
