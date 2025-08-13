const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Booking = sequelize.define(
  "Booking",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    start_datetime: {
      type: DataTypes.DATE, // TIMESTAMP WITH TIME ZONE в Postgres
      allowNull: false,
    },
    end_datetime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "в ожидании",
        "подтвержденный",
        "завершенный",
        "отмененный_владельцем",
        "отмененный_работником",
        "отклоненный"
      ),
      allowNull: false,
      defaultValue: "в ожидании",
    },
    total_price: {
      // Может рассчитываться при создании/подтверждении
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    notes_for_sitter: {
      // Заметки от владельца
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cancellation_reason: {
      // Причина отмены (ситтером или владельцем)
      type: DataTypes.TEXT,
      allowNull: true,
    },
    contract_path: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    booking_series_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    tableName: "bookings",
    timestamps: true,
    // underscored: true,
  }
);

Booking.associate = (models) => {
  // Бронирование инициировано одним пользователем (владельцем)
  Booking.belongsTo(models.User, {
    foreignKey: "owner_user_id", // Колонка будет создана в bookings
    as: "Owner",
  });
  // Бронирование выполняется одним пользователем (ситтером)
  Booking.belongsTo(models.User, {
    foreignKey: "sitter_user_id", // Колонка будет создана в bookings
    as: "Sitter",
  });
  // Бронирование относится к одному питомцу
  Booking.belongsTo(models.Pet, {
    foreignKey: "pet_id", // Колонка будет создана в bookings
    as: "Pet",
  });
  // Бронирование относится к одной услуге
  Booking.belongsTo(models.Service, {
    foreignKey: "service_id", // Колонка будет создана в bookings
    as: "Service",
  });
  // У бронирования может быть один отзыв
  Booking.hasOne(models.Review, {
    foreignKey: "booking_id", // Колонка в таблице reviews
    as: "Review",
  });
};

module.exports = Booking;
