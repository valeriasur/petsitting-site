const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Pet = sequelize.define(
  "Pet",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    breed: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    size: {
      type: DataTypes.ENUM(
        "Не указан",
        "Мини (до 5 кг)",
        "Малый (5 - 10 кг)",
        "Средний (10 - 20 кг)",
        "Большой (20 - 40 кг)",
        "Очень большой (40 и более кг)"
      ),
      defaultValue: "Не указан",
      allowNull: false,
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    gender: {
      type: DataTypes.ENUM("Не указан", "Женский", "Мужской"),
      allowNull: false,
    },
    is_sterilized: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    animal_neighborhood: {
      type: DataTypes.ENUM(
        "Никакие",
        "Собаки мальчики",
        "Собаки девочки",
        "Кошки"
      ),
    },
    alone_home: {
      type: DataTypes.ENUM(
        "Остается одна, пока я на работе",
        "Остается на пару часов",
        "Почти всегда дома кто то есть"
      ),
    },
    is_vaccinated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    photo_path: {
      // <--- НОВОЕ ПОЛЕ
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "pets",
    timestamps: true,
    // underscored: true,
  }
);

// Перенесите ассоциации в отдельный метод
Pet.associate = function (models) {
  Pet.belongsTo(models.User, {
    foreignKey: "owner_user_id",
    as: "Owner",
  });
  Pet.belongsTo(models.PetType, {
    foreignKey: "pet_type_id",
    as: "PetType",
  });
  Pet.hasMany(models.Booking, {
    foreignKey: "pet_id",
    as: "Bookings",
  });
};

// В конце файла, перед экспортом
console.log("Pet model initialized:", this === Pet);
module.exports = Pet;
