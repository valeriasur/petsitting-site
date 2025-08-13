// src/components/SitterProfilePage.js
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Calendar from "react-calendar";
import axios from "axios";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "react-calendar/dist/Calendar.css";
import DefaultAvatarPlaceholderImage from "../images/iconDefaultAccount.png";
import "./SitterProfilePage.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const BOARDING_SERVICE_ID = 1;
const WALKING_SERVICE_ID = 2;
const HOUSESITTING_SERVICE_ID = 3;

const SERVICE_DURATIONS = {
  [WALKING_SERVICE_ID]: [
    { label: "30 минут", value: 30 },
    { label: "1 час", value: 60 },
    { label: "1.5 часа", value: 90 },
  ],
  [HOUSESITTING_SERVICE_ID]: [
    { label: "15 минут", value: 15 },
    { label: "30 минут", value: 30 },
    { label: "1 час", value: 60 },
    { label: "2 часа", value: 120 },
  ],
};

const isDateGenerallyBooked = (date, activeBookings) => {
  const calendarDayStart = new Date(date);
  calendarDayStart.setHours(0, 0, 0, 0);
  const calendarDayEnd = new Date(date);
  calendarDayEnd.setHours(23, 59, 59, 999);

  return activeBookings.some((booking) => {
    if (!booking.start_datetime || !booking.end_datetime) return false;
    const bookingStart = new Date(booking.start_datetime);
    const bookingEnd = new Date(booking.end_datetime);
    return bookingStart <= calendarDayEnd && bookingEnd >= calendarDayStart;
  });
};

const getFullPhotoUrl = (photoPath) => {
  if (!photoPath) return DefaultAvatarPlaceholderImage;
  const cleanApiUrl = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  if (photoPath.startsWith("http")) return photoPath;
  const cleanRelativePath = photoPath.startsWith("/")
    ? photoPath.substring(1)
    : photoPath;
  return `${cleanApiUrl}/${cleanRelativePath}`;
};

function pluralizeReviews(count) {
  if (count === undefined || count === null) count = 0;
  const num = Math.abs(count) % 100;
  const num1 = num % 10;
  if (num > 10 && num < 20) return "отзывов";
  if (num1 > 1 && num1 < 5) return "отзыва";
  if (num1 === 1) return "отзыв";
  return "отзывов";
}

function pluralizeYears(count) {
  if (count === undefined || count === null) return "";
  if (typeof count !== "number" || isNaN(count)) return "";
  const num = Math.abs(count) % 100;
  const num1 = num % 10;
  if (num > 10 && num < 20) return "лет";
  if (num1 > 1 && num1 < 5) return "года";
  if (num1 === 1) return "год";
  return "лет";
}

function SitterProfilePage() {
  const { userId: sitterUserId } = useParams();
  const navigate = useNavigate(); // ESLint может предупредить, если не используется

  const isUserLoggedIn = !!localStorage.getItem("token");

  const [sitterData, setSitterData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentOwnerData, setCurrentOwnerData] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [selectedServiceIdForCalendar, setSelectedServiceIdForCalendar] =
    useState("");
  const [selectedDates, setSelectedDates] = useState(null);
  const [selectedSingleDate, setSelectedSingleDate] = useState(null);

  const { userId: sitterUserIdFromParams } = useParams();

  const [timeSlots, setTimeSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedStartTime, setSelectedStartTime] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("");

  const [ownerPets, setOwnerPets] = useState([]);
  const [isLoadingPets, setIsLoadingPets] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingError, setBookingError] = useState(null);

  const [repetitionType, setRepetitionType] = useState("single"); // 'single' или 'daily'
  const [repetitionEndDate, setRepetitionEndDate] = useState(null); // Date object (локальное)
  const [showRepetitionOptions, setShowRepetitionOptions] = useState(false);

  const isRangeBasedService = // true если выбрана Передержка (BOARDING_SERVICE_ID)
    Number(selectedServiceIdForCalendar) === BOARDING_SERVICE_ID;
  const isWalkOrVisitService = // Используем для показа опций повторения
    Number(selectedServiceIdForCalendar) === WALKING_SERVICE_ID ||
    Number(selectedServiceIdForCalendar) === HOUSESITTING_SERVICE_ID;

  // +++ useEffect ДЛЯ ОПЦИЙ ПОВТОРЕНИЯ +++
  useEffect(() => {
    if (
      isWalkOrVisitService &&
      selectedSingleDate &&
      selectedStartTime &&
      selectedDuration
    ) {
      setShowRepetitionOptions(true);
    } else {
      setShowRepetitionOptions(false);
      setRepetitionType("single"); // Сброс при скрытии
      setRepetitionEndDate(null);
    }
  }, [
    isWalkOrVisitService,
    selectedSingleDate,
    selectedStartTime,
    selectedDuration,
  ]);

  // useEffect для вызова fetchTimeSlots при изменении даты или выбранной услуги
  useEffect(() => {
    if (
      !isRangeBasedService &&
      selectedSingleDate &&
      selectedServiceIdForCalendar &&
      sitterUserIdFromParams
    ) {
      const serviceIdNum = Number(selectedServiceIdForCalendar);
      const durationsForService = SERVICE_DURATIONS[serviceIdNum];
      const queryDuration = durationsForService?.[0]?.value || 30;

      // При смене даты или услуги, сбрасываем выбранное время и длительность,
      // так как список слотов будет новым.
      setSelectedStartTime("");
      setSelectedDuration("");

      fetchTimeSlots(
        sitterUserIdFromParams,
        selectedSingleDate,
        serviceIdNum,
        queryDuration
      );
    } else if (
      (!selectedSingleDate || !selectedServiceIdForCalendar) &&
      !isRangeBasedService
    ) {
      setTimeSlots([]);
      setSelectedStartTime("");
      setSelectedDuration("");
    }
    // НЕ включаем fetchTimeSlots в зависимости
  }, [
    selectedSingleDate,
    selectedServiceIdForCalendar,
    isRangeBasedService,
    sitterUserIdFromParams,
  ]);

  // useEffect для вызова fetchTimeSlots при изменении ВЫБРАННОЙ ДЛИТЕЛЬНОСТИ
  useEffect(() => {
    if (
      !isRangeBasedService &&
      selectedSingleDate &&
      selectedServiceIdForCalendar &&
      selectedDuration && // Ключевое условие - выбрана длительность
      selectedStartTime && // И время начала тоже должно быть выбрано
      sitterUserIdFromParams
    ) {
      const serviceIdNum = Number(selectedServiceIdForCalendar);
      const durationMinutesNum = parseInt(selectedDuration, 10);

      if (!isNaN(durationMinutesNum) && durationMinutesNum > 0) {
        // Когда меняется только длительность, время начала уже выбрано.
        // Мы запрашиваем новый список слотов, который может отфильтровать текущее selectedStartTime,
        // если оно станет недоступным для новой длительности.
        // Поэтому, после этого запроса, нужно проверить, есть ли selectedStartTime в новом списке timeSlots.
        // Если нет - сбросить selectedStartTime.
        fetchTimeSlots(
          sitterUserIdFromParams,
          selectedSingleDate,
          serviceIdNum,
          durationMinutesNum
        ).then(() => {
          // Эта часть выполнится ПОСЛЕ того, как fetchTimeSlots завершится и setTimeSlots обновит состояние.
          // Но setTimeSlots асинхронный, поэтому timeSlots здесь может быть еще старым.
          // Лучше эту проверку сделать в отдельном useEffect, который следит за timeSlots и selectedStartTime.
        });
      }
    }
    // НЕ включаем fetchTimeSlots в зависимости
  }, [
    selectedDuration,
    selectedSingleDate,
    selectedServiceIdForCalendar,
    selectedStartTime,
    isRangeBasedService,
    sitterUserIdFromParams,
  ]);

  // Новый useEffect для проверки и сброса selectedStartTime, если его нет в обновленных timeSlots
  useEffect(() => {
    if (
      selectedStartTime &&
      timeSlots.length > 0 &&
      !timeSlots.includes(selectedStartTime)
    ) {
      console.log(
        `Время начала "${selectedStartTime}" больше не доступно после изменения длительности. Сбрасываем.`
      );
      setSelectedStartTime("");
      // Возможно, также стоит сбросить и selectedDuration, чтобы пользователь выбрал заново,
      // так как предыдущий выбор длительности привел к недоступности времени.
      // setSelectedDuration("");
    }
  }, [timeSlots, selectedStartTime]);

  useEffect(() => {
    const fetchCurrentOwnerData = async () => {
      if (isUserLoggedIn) {
        const token = localStorage.getItem("token");
        try {
          const response = await axios.get(`${API_BASE_URL}/api/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.data?.user) setCurrentOwnerData(response.data.user);
        } catch (err) {
          console.error(
            "Ошибка загрузки профиля текущего пользователя:",
            err.response?.data || err.message
          );
        }
      } else {
        setCurrentOwnerData(null);
      }
    };
    fetchCurrentOwnerData();
  }, [isUserLoggedIn]);

  useEffect(() => {
    const fetchSitterData = async () => {
      if (!sitterUserId) {
        setError("ID ситтера не найден.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      setSitterData(null);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/sitters/${sitterUserId}`
        );
        setSitterData(response.data);
        if (
          response.data?.OfferedServices?.length > 0 &&
          response.data.OfferedServices[0]?.service_id
        ) {
          const initialServiceId =
            response.data.OfferedServices[0].service_id.toString();
          setSelectedServiceIdForCalendar(initialServiceId);
        } else {
          setSelectedServiceIdForCalendar("");
        }
        setSelectedDates(null);
        setSelectedSingleDate(null);
        setTimeSlots([]);
        setSelectedStartTime("");
        setSelectedDuration("");
      } catch (err) {
        console.error(
          "SitterProfilePage fetchSitterData error:",
          err.response?.data || err.message
        );
        setError(
          err.response?.data?.message ||
            "Произошла ошибка при загрузке профиля ситтера."
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchSitterData();
  }, [sitterUserId]);

  useEffect(() => {
    const fetchOwnerPets = async () => {
      if (!isUserLoggedIn) {
        setOwnerPets([]);
        return;
      }
      const token = localStorage.getItem("token");
      setIsLoadingPets(true);
      setOwnerPets([]);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/pets/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOwnerPets(response.data || []);
      } catch (err) {
        console.error(
          "Ошибка загрузки питомцев владельца:",
          err.response?.data || err.message
        );
      } finally {
        setIsLoadingPets(false);
      }
    };
    fetchOwnerPets();
  }, [isUserLoggedIn]);

  const allActiveSitterBookings = useMemo(() => {
    const bookings = sitterData?.UserAccount?.SitterBookings;
    if (!bookings) return [];
    const availabilityStatuses = ["в ожидании", "подтвержденный"];
    return bookings.filter((booking) =>
      availabilityStatuses.includes(booking.status?.toLowerCase())
    );
  }, [sitterData?.UserAccount?.SitterBookings]);

  const fetchTimeSlots = async (
    sitterId,
    dateToFetch,
    serviceId,
    durationForSlotsQuery
  ) => {
    if (!sitterId || !dateToFetch || !serviceId || !durationForSlotsQuery) {
      console.warn(
        "fetchTimeSlots: Пропущены параметры или sitterId не доступен",
        {
          sitterId,
          dateToFetch,
          serviceId,
          duration: durationForSlotsQuery,
        }
      );
      setTimeSlots([]); // Важно сбрасывать, если параметры некорректны
      return;
    }

    setIsLoadingSlots(true);
    setTimeSlots([]); // Очищаем слоты перед новым запросом
    // setSelectedStartTime(""); // НЕ сбрасываем здесь, если не хотим сброса при смене длительности
    setBookingError(null);

    try {
      const year = dateToFetch.getFullYear();
      const month = (dateToFetch.getMonth() + 1).toString().padStart(2, "0"); // Месяцы от 0 до 11
      const day = dateToFetch.getDate().toString().padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;

      const response = await axios.get(
        `${API_BASE_URL}/api/sitters/${sitterId}/availability-slots`,
        {
          params: {
            date: dateString, // Отправляем YYYY-MM-DD
            serviceId: Number(serviceId),
            durationMinutes: durationForSlotsQuery,
          },
        }
      );

      setTimeSlots(response.data || []);
    } catch (err) {
      console.error(
        "Ошибка загрузки временных слотов:",
        err.response?.data || err.message
      );
      setBookingError(
        err.response?.data?.message || "Не удалось загрузить доступные слоты."
      );
      setTimeSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleServiceChange = (newServiceId) => {
    setSelectedServiceIdForCalendar(newServiceId);
    setSelectedDates(null);
    setSelectedSingleDate(null);
    setTimeSlots([]);
    setSelectedStartTime("");
    setSelectedDuration("");
    setBookingError(null);
    setBookingSuccess(null);
    // +++ СБРОС ОПЦИЙ ПОВТОРЕНИЯ +++
    setShowRepetitionOptions(false);
    setRepetitionType("single");
    setRepetitionEndDate(null);
    // +++ КОНЕЦ СБРОСА +++
  };

  const handleCalendarDateChange = (valueFromCalendar) => {
    setBookingSuccess(null);
    setBookingError(null);

    const serviceIdNum = Number(selectedServiceIdForCalendar);
    // Это определяет, как ДОЛЖЕН работать календарь (selectRange true или false)
    const isCalendarConfiguredForRangeMode =
      serviceIdNum === BOARDING_SERVICE_ID;

    console.log(
      `handleCalendarDateChange - Service ID: ${serviceIdNum}, Calendar Configured For Range: ${isCalendarConfiguredForRangeMode}`
    );
    console.log("Value FROM CALENDAR:", valueFromCalendar);

    if (isCalendarConfiguredForRangeMode) {
      // Услуга "Передержка"
      //setSelectedSingleDate(null); // Не сбрасываем одиночную дату, если она была выбрана для другой услуги
      // selectedDates будет основным состоянием для передержки

      if (
        Array.isArray(valueFromCalendar) &&
        valueFromCalendar.length === 2 &&
        valueFromCalendar[0] instanceof Date &&
        valueFromCalendar[1] instanceof Date
      ) {
        // Пользователь выбрал диапазон
        console.log(
          "Range mode - received array. Start:",
          valueFromCalendar[0].toLocaleDateString("ru-RU"),
          "End:",
          valueFromCalendar[1].toLocaleDateString("ru-RU")
        );
        const cleanStartDate = new Date(
          valueFromCalendar[0].getFullYear(),
          valueFromCalendar[0].getMonth(),
          valueFromCalendar[0].getDate()
        );
        const cleanEndDate = new Date(
          valueFromCalendar[1].getFullYear(),
          valueFromCalendar[1].getMonth(),
          valueFromCalendar[1].getDate()
        );
        setSelectedDates([cleanStartDate, cleanEndDate]);
        setSelectedSingleDate(null); // Очищаем, так как диапазон выбран
      } else if (valueFromCalendar instanceof Date) {
        // Пользователь кликнул на одну дату в режиме selectRange (это возможно)
        // Трактуем это как выбор передержки на один день
        console.warn(
          "Range mode - received single Date. Setting single-day range:",
          valueFromCalendar.toLocaleDateString("ru-RU")
        );
        const cleanDate = new Date(
          valueFromCalendar.getFullYear(),
          valueFromCalendar.getMonth(),
          valueFromCalendar.getDate()
        );
        setSelectedDates([cleanDate, cleanDate]); // Устанавливаем диапазон из одного дня
        setSelectedSingleDate(null); // Очищаем, так как диапазон (однодневный) выбран
      } else if (!isRangeBasedService) {
        // Для услуг, не являющихся передержкой
        setSelectedStartTime("");
        setSelectedDuration("");
      } else {
        console.error(
          "Range mode - unexpected value from calendar:",
          valueFromCalendar
        );
        // Возможно, стоит сбросить selectedDates, если пришло что-то не то
        // setSelectedDates(null);
      }
    } else {
      // Услуги "Выгул" или "Визит няни" (одиночная дата)
      setSelectedDates(null); // Сбрасываем диапазон, так как выбрана услуга с одиночной датой

      if (valueFromCalendar instanceof Date) {
        console.log(
          "Single date mode - received single Date:",
          valueFromCalendar.toLocaleDateString("ru-RU")
        );
        const newCleanDate = new Date(
          valueFromCalendar.getFullYear(),
          valueFromCalendar.getMonth(),
          valueFromCalendar.getDate()
        );
        setSelectedSingleDate(newCleanDate);
      } else if (
        Array.isArray(valueFromCalendar) &&
        valueFromCalendar[0] instanceof Date
      ) {
        // Если календарь был в режиме диапазона и пользователь переключил услугу
        // на ту, что требует одну дату, календарь мог вернуть массив.
        // Берем первую дату из этого массива.
        console.warn(
          "Single date mode - received array. Using the first date:",
          valueFromCalendar[0].toLocaleDateString("ru-RU")
        );
        const newCleanDate = new Date(
          valueFromCalendar[0].getFullYear(),
          valueFromCalendar[0].getMonth(),
          valueFromCalendar[0].getDate()
        );
        setSelectedSingleDate(newCleanDate);
      } else {
        console.error(
          "Single date mode - unexpected value from calendar:",
          valueFromCalendar
        );
        // setSelectedSingleDate(null);
      }
    }
  };

  const tileClassName = useCallback(
    ({ date, view }) => {
      if (view !== "month") return null;
      const classes = [];
      const serviceIdNum = Number(selectedServiceIdForCalendar);

      // 1. Проверяем, есть ли на этот день активная ПЕРЕДЕРЖКА
      const hasBoardingBookingOnDate = allActiveSitterBookings.some(
        (booking) =>
          Number(booking.service_id) === BOARDING_SERVICE_ID &&
          isDateGenerallyBooked(date, [booking])
      );

      // 2. Проверяем, есть ли на этот день ЛЮБОЕ активное бронирование (любого типа)
      const hasAnyBookingOnDate = isDateGenerallyBooked(
        date,
        allActiveSitterBookings
      );

      // Логика окрашивания дня красным (класс "booked-date")
      if (hasBoardingBookingOnDate) {
        // Если на дне есть ПЕРЕДЕРЖКА, он всегда красный для ЛЮБОЙ выбранной услуги
        classes.push("booked-date");
      } else if (serviceIdNum === BOARDING_SERVICE_ID && hasAnyBookingOnDate) {
        // Если пытаемся забронировать ПЕРЕДЕРЖКУ, а на дне есть ЛЮБОЕ ДРУГОЕ бронирование (выгул, визит),
        // то этот день тоже красный для передержки.
        classes.push("booked-date");
      }

      // Подсветка выбранной даты/диапазона (оставляем как есть)
      if (isRangeBasedService && selectedDates) {
        const [start, end] = selectedDates;
        if (start && date.toDateString() === start.toDateString())
          classes.push("selected-start-date");
        if (end && date.toDateString() === end.toDateString())
          classes.push("selected-end-date");
        if (
          start &&
          end &&
          start.getTime() !== end.getTime() &&
          date > start &&
          date < end
        )
          classes.push("selected-range-date");
        if (
          start &&
          end &&
          start.getTime() === end.getTime() &&
          date.getTime() === start.getTime()
        )
          classes.push("selected-single-date"); // Для однодневной передержки
      } else if (!isRangeBasedService && selectedSingleDate) {
        if (date.toDateString() === selectedSingleDate.toDateString())
          classes.push("selected-single-date");
      }

      // Добавим класс для выходных дней, если это суббота или воскресенье
      if (date.getDay() === 0 || date.getDay() === 6) {
        classes.push("weekend-date"); // Добавьте стиль для .weekend-date в CSS (например, другой цвет текста)
      }

      return classes.length > 0 ? classes.join(" ") : null;
    },
    [
      selectedServiceIdForCalendar, // Добавлена зависимость
      selectedDates,
      selectedSingleDate,
      allActiveSitterBookings,
      isRangeBasedService,
    ]
  );

  const tileDisabled = useCallback(
    ({ date, view }) => {
      if (view !== "month") return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) return true; // Дни в прошлом всегда отключены

      const serviceIdNum = Number(selectedServiceIdForCalendar);

      // 1. Проверяем, есть ли на этот день активная ПЕРЕДЕРЖКА
      const hasBoardingBookingOnDate = allActiveSitterBookings.some(
        (booking) =>
          Number(booking.service_id) === BOARDING_SERVICE_ID &&
          isDateGenerallyBooked(date, [booking])
      );

      // 2. Проверяем, есть ли на этот день ЛЮБОЕ активное бронирование
      const hasAnyBookingOnDate = isDateGenerallyBooked(
        date,
        allActiveSitterBookings
      );

      if (hasBoardingBookingOnDate) {
        // Если на дне есть ПЕРЕДЕРЖКА, он всегда недоступен для клика для ЛЮБОЙ выбранной услуги
        return true;
      }

      if (serviceIdNum === BOARDING_SERVICE_ID) {
        // Если пытаемся забронировать ПЕРЕДЕРЖКУ:
        // День недоступен, если на нем есть ЛЮБОЕ другое бронирование (выгул, визит).
        // (Случай с существующей передержкой уже покрыт выше)
        return hasAnyBookingOnDate;
      } else {
        // Если пытаемся забронировать ВЫГУЛ или ВИЗИТ:
        // День доступен для клика (не disabled), даже если на нем есть другие выгулы/визиты.
        // Бэкенд разберется со слотами.
        // Единственное, что его блокирует - это наличие передержки (уже покрыто выше).
        return false;
      }
    },
    [
      selectedServiceIdForCalendar, // Добавлена зависимость
      allActiveSitterBookings,
      // isRangeBasedService - больше не нужен здесь напрямую, используем serviceIdNum
    ]
  );

  const handleBookingSubmit = async () => {
    if (!isUserLoggedIn) {
      setBookingError("Для бронирования необходимо войти в систему.");
      return;
    }
    if (!selectedPetId) {
      setBookingError("Пожалуйста, выберите питомца.");
      return;
    }
    if (!selectedServiceIdForCalendar) {
      setBookingError("Пожалуйста, выберите услугу.");
      return;
    }

    const numericSelectedServiceId = Number(selectedServiceIdForCalendar);
    const ownerAddress = currentOwnerData?.address_details;

    if (numericSelectedServiceId === BOARDING_SERVICE_ID) {
      if (!ownerAddress) {
        setBookingError(
          <span>
            Пожалуйста, укажите ваш адрес в{" "}
            <Link to="/profile/bookingDetails" className="inline-link">
              профиле (Данные для договора)
            </Link>{" "}
            перед бронированием этой услуги.
          </span>
        );
        return;
      }
    } else if (
      numericSelectedServiceId === WALKING_SERVICE_ID ||
      numericSelectedServiceId === HOUSESITTING_SERVICE_ID
    ) {
      if (!ownerAddress) {
        setBookingError(
          <span>
            Пожалуйста, укажите ваш адрес в{" "}
            <Link to="/profile/bookingDetails" className="inline-link">
              профиле (Данные для договора)
            </Link>
            , так как услуга будет оказана у вас.
          </span>
        );
        return;
      }
    }

    setIsBooking(true);
    setBookingSuccess(null);
    setBookingError(null);
    let startDateISO, endDateISO;

    if (isRangeBasedService) {
      if (!selectedDates || !selectedDates[0] || !selectedDates[1]) {
        setBookingError("Пожалуйста, выберите диапазон дат для передержки.");
        setIsBooking(false);
        return;
      }
      const startDate = new Date(selectedDates[0]);
      startDate.setHours(0, 0, 0, 0);
      startDateISO = startDate.toISOString();
      const endDateForAPI = new Date(selectedDates[1]);
      endDateForAPI.setHours(23, 59, 59, 999);
      endDateISO = endDateForAPI.toISOString();
    } else {
      if (!selectedSingleDate || !selectedStartTime || !selectedDuration) {
        setBookingError(
          "Пожалуйста, выберите дату, время начала и длительность."
        );
        setIsBooking(false);
        return;
      }
      const [hours, minutes] = selectedStartTime.split(":").map(Number);
      const startDate = new Date(selectedSingleDate);
      startDate.setHours(hours, minutes, 0, 0);
      const durationMinutesNum = parseInt(selectedDuration, 10);
      const endDate = new Date(startDate);
      endDate.setMinutes(startDate.getMinutes() + durationMinutesNum);
      startDateISO = startDate.toISOString();
      endDateISO = endDate.toISOString();
    }

    // +++ ОБНОВЛЕННОЕ ФОРМИРОВАНИЕ PAYLOAD +++
    let bookingPayload = {
      sitterUserId, // sitterUserId из useParams()
      petId: selectedPetId,
      serviceId: selectedServiceIdForCalendar,
      notes: bookingNotes || null,
    };

    if (isRangeBasedService) {
      // Передержка
      if (!selectedDates || !selectedDates[0] || !selectedDates[1]) {
        setBookingError("Пожалуйста, выберите диапазон дат для передержки.");
        setIsBooking(false);
        return;
      }
      const startDate = new Date(selectedDates[0]);
      startDate.setHours(0, 0, 0, 0); // Начало дня
      const endDateForAPI = new Date(selectedDates[1]);
      endDateForAPI.setHours(23, 59, 59, 999); // Конец дня

      bookingPayload.startDate = startDate.toISOString();
      bookingPayload.endDate = endDateForAPI.toISOString();
      // repetition не передаем или null для передержки
    } else if (isWalkOrVisitService) {
      // Выгул или Визит
      if (!selectedSingleDate || !selectedStartTime || !selectedDuration) {
        setBookingError(
          "Пожалуйста, выберите дату, время начала и длительность."
        );
        setIsBooking(false);
        return;
      }

      const [hours, minutes] = selectedStartTime.split(":").map(Number);
      const firstEventStart = new Date(selectedSingleDate);
      firstEventStart.setHours(hours, minutes, 0, 0);

      const durationMinutesNum = parseInt(selectedDuration, 10);
      const firstEventEnd = new Date(firstEventStart);
      firstEventEnd.setMinutes(
        firstEventStart.getMinutes() + durationMinutesNum
      );

      if (repetitionType === "daily") {
        if (!repetitionEndDate) {
          setBookingError("Пожалуйста, выберите дату окончания повторения.");
          setIsBooking(false);
          return;
        }
        // Проверка: дата окончания не раньше даты начала
        const checkStartDate = new Date(selectedSingleDate); // Только дата, без времени
        checkStartDate.setHours(0, 0, 0, 0);
        const checkEndDate = new Date(repetitionEndDate);
        checkEndDate.setHours(0, 0, 0, 0);

        if (checkEndDate < checkStartDate) {
          setBookingError(
            "Дата окончания повторения не может быть раньше даты начала."
          );
          setIsBooking(false);
          return;
        }

        bookingPayload.actualStartDate = firstEventStart.toISOString();
        bookingPayload.actualEndDate = firstEventEnd.toISOString();
        bookingPayload.repetition = {
          type: "daily",
          // Отправляем дату в формате YYYY-MM-DD
          endDate: `${repetitionEndDate.getFullYear()}-${(
            repetitionEndDate.getMonth() + 1
          )
            .toString()
            .padStart(2, "0")}-${repetitionEndDate
            .getDate()
            .toString()
            .padStart(2, "0")}`,
        };
      } else {
        // repetitionType === "single"
        bookingPayload.startDate = firstEventStart.toISOString();
        bookingPayload.endDate = firstEventEnd.toISOString();
        // repetition не передаем или null
      }
    } else {
      setBookingError("Выбран некорректный тип услуги для бронирования.");
      setIsBooking(false);
      return;
    }
    // +++ КОНЕЦ ОБНОВЛЕННОГО ФОРМИРОВАНИЯ PAYLOAD +++

    try {
      const token = localStorage.getItem("token");
      const bookingCreationResponse = await axios.post(
        // Результат axios.post
        `${API_BASE_URL}/api/bookings`,
        bookingPayload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Улучшенное сообщение об успехе
      if (
        bookingPayload.repetition &&
        bookingPayload.repetition.type === "daily" &&
        bookingCreationResponse.data && // <--- Используем bookingCreationResponse
        bookingCreationResponse.data.message
      ) {
        setBookingSuccess(bookingCreationResponse.data.message); // <--- Используем bookingCreationResponse
      } else {
        setBookingSuccess(
          "Бронирование успешно создано! Ожидайте подтверждения от ситтера."
        );
      }

      // Сброс всех релевантных состояний
      setSelectedPetId("");
      setBookingNotes("");
      setSelectedDates(null);
      setSelectedSingleDate(null);
      setTimeSlots([]);
      setSelectedStartTime("");
      setSelectedDuration("");
      setRepetitionType("single");
      setRepetitionEndDate(null);
      setShowRepetitionOptions(false); // Важно

      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/sitters/${sitterUserId}`
        );
        setSitterData(response.data);
      } catch (fetchErr) {
        console.error(
          "Ошибка при обновлении данных ситтера после бронирования:",
          fetchErr.response?.data || fetchErr.message
        );
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Не удалось создать бронирование.";
      setBookingError(errorMsg);
    } finally {
      setIsBooking(false);
    }
  };

  const openLightbox = (index) => {
    if (index >= 0) {
      setLightboxIndex(index);
      setLightboxOpen(true);
    }
  };

  if (isLoading)
    return <div className="profile-loading">Загрузка профиля...</div>;
  if (error) return <div className="profile-error">Ошибка: {error}</div>;
  if (!sitterData)
    return <div className="profile-not-found">Профиль ситтера не найден.</div>;

  const {
    bio,
    experience_years,
    address_area,
    housing_type,
    housing_photo_paths = [],
    accepted_sizes = [],
    accepted_ages = [],
    profile_photo_path,
    can_administer_meds,
    can_give_injections,
    has_children_under_10,
    has_constant_supervision,
    has_own_dogs,
    has_own_cats,
    has_other_pets,
    other_pets_description,
    UserAccount,
    OfferedServices = [],
    avg_rating,
    review_count,
    Reviews = [],
  } = sitterData;

  const displayName = UserAccount
    ? `${UserAccount.first_name || ""} ${
        UserAccount.last_name ? UserAccount.last_name.charAt(0) + "." : ""
      }`.trim()
    : "Имя не указано";
  const averageRating = avg_rating ? Number(avg_rating) : null;

  const lightboxSlides = [];
  const mainProfilePhotoUrl = getFullPhotoUrl(
    UserAccount?.avatarURL || profile_photo_path
  );
  let mainProfilePhotoIndex = -1;
  if (UserAccount?.avatarURL || profile_photo_path) {
    lightboxSlides.push({
      src: mainProfilePhotoUrl,
      title: `Фото профиля: ${displayName}`,
    });
    mainProfilePhotoIndex = lightboxSlides.length - 1;
  }
  const validHousingPhotos = (housing_photo_paths || []).filter((p) => p);
  validHousingPhotos.forEach((photoPath) => {
    lightboxSlides.push({
      src: getFullPhotoUrl(photoPath),
      title: `Фото жилья`,
    });
  });

  const displayCity =
    UserAccount?.address_details?.split(",")[0]?.trim() ||
    address_area ||
    "Город не указан";

  return (
    <div className="sitter-profile-page">
      <header className="profile-header">
        <div className="profile-avatar">
          <img
            src={mainProfilePhotoUrl}
            alt={`Фото ${displayName}`}
            onClick={() => {
              if (mainProfilePhotoIndex !== -1 && lightboxSlides.length > 0)
                openLightbox(mainProfilePhotoIndex);
            }}
            style={{
              cursor: mainProfilePhotoIndex !== -1 ? "pointer" : "default",
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = DefaultAvatarPlaceholderImage;
            }}
          />
        </div>
        <div className="profile-header-info">
          <h1>{displayName}</h1>
          <p className="profile-location">{displayCity}</p>
          {(review_count || 0) > 0 && (
            <div className="profile-rating-summary">
              {averageRating !== null && (
                <span className="rating-score">
                  ⭐ {averageRating.toFixed(1)}
                </span>
              )}
              <span className="review-count">
                ({review_count || 0} {pluralizeReviews(review_count || 0)})
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="profile-content">
        <section className="profile-section profile-about">
          <h2>О себе</h2>
          {bio ? <p>{bio}</p> : <p>Описание не предоставлено.</p>}
          {typeof experience_years === "number" && experience_years >= 0 && (
            <p>
              <strong>Опыт работы:</strong> {experience_years}{" "}
              {pluralizeYears(experience_years)}
            </p>
          )}
          <p>
            <strong>Проживание:</strong> {housing_type || "Не указано"}
          </p>
          {address_area && (
            <p>
              <strong>Местоположение (район):</strong> {address_area}
            </p>
          )}
        </section>

        <section className="profile-section profile-services">
          <h2>Услуги и цены</h2>
          {OfferedServices && OfferedServices.length > 0 ? (
            <ul>
              {OfferedServices.map((service) => {
                const basePriceFormatted =
                  service.price !== null && service.price !== undefined
                    ? `${parseFloat(service.price).toFixed(0)} ₽`
                    : null;
                let priceDetails = "";

                if (service.price_unit === "day" && basePriceFormatted) {
                  priceDetails = `от ${basePriceFormatted} за сутки`;
                } else if (
                  service.price_unit === "per_30_min" &&
                  basePriceFormatted
                ) {
                  priceDetails = `${basePriceFormatted} за 30 минут`;
                } else if (basePriceFormatted) {
                  // Фоллбэк для неожиданных price_unit
                  priceDetails = `${basePriceFormatted} (единица: ${service.price_unit})`;
                } else {
                  priceDetails = "(цена не указана)";
                }

                return (
                  <li key={service.id || service.service_id}>
                    <strong>
                      {service.ServiceDetails?.description ||
                        service.ServiceDetails?.name ||
                        `Услуга ID ${service.service_id}`}
                    </strong>
                    : {priceDetails}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>Работник пока не добавил информацию об услугах.</p>
          )}
        </section>

        {validHousingPhotos.length > 0 && (
          <section className="profile-section profile-housing-photos">
            <h2>Фото жилья</h2>
            <div className="photo-gallery">
              {validHousingPhotos.map((photoPath, index) => {
                const imageUrl = getFullPhotoUrl(photoPath);
                const correspondingSlideIndex = lightboxSlides.findIndex(
                  (slide) => slide.src === imageUrl
                );
                return (
                  <img
                    key={index}
                    src={imageUrl}
                    alt={`Фото жилья ${index + 1}`}
                    className="housing-photo-thumbnail"
                    onClick={() => {
                      if (correspondingSlideIndex !== -1)
                        openLightbox(correspondingSlideIndex);
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                );
              })}
            </div>
          </section>
        )}

        <section className="profile-section profile-pet-conditions">
          <h2>Условия для питомцев</h2>
          {accepted_sizes?.length > 0 && (
            <p>
              <strong>Принимаемые размеры:</strong> {accepted_sizes.join(", ")}
            </p>
          )}
          {accepted_ages?.length > 0 && (
            <p>
              <strong>Принимаемый возраст:</strong> {accepted_ages.join(", ")}
            </p>
          )}
          <p>
            <strong>Дети до 10 лет в доме:</strong>{" "}
            {typeof has_children_under_10 === "boolean"
              ? has_children_under_10
                ? "Да"
                : "Нет"
              : "Не указано"}
          </p>
          <p>
            <strong>Свои собаки:</strong>{" "}
            {typeof has_own_dogs === "boolean"
              ? has_own_dogs
                ? "Есть"
                : "Нет"
              : "Не указано"}
          </p>
          <p>
            <strong>Свои кошки:</strong>{" "}
            {typeof has_own_cats === "boolean"
              ? has_own_cats
                ? "Есть"
                : "Нет"
              : "Не указано"}
          </p>
          <p>
            <strong>Другие свои животные:</strong>{" "}
            {typeof has_other_pets === "boolean"
              ? has_other_pets
                ? other_pets_description || "Есть"
                : "Нет"
              : "Не указано"}
          </p>
        </section>

        <section className="profile-section profile-skills">
          <h2>Дополнительно</h2>
          <p>
            <strong>Может давать лекарства:</strong>{" "}
            {typeof can_administer_meds === "boolean"
              ? can_administer_meds
                ? "Да"
                : "Нет"
              : "Не указано"}
          </p>
          <p>
            <strong>Может делать инъекции:</strong>{" "}
            {typeof can_give_injections === "boolean"
              ? can_give_injections
                ? "Да"
                : "Нет"
              : "Не указано"}
          </p>
          <p>
            <strong>Постоянный присмотр:</strong>{" "}
            {typeof has_constant_supervision === "boolean"
              ? has_constant_supervision
                ? "Да"
                : "Нет"
              : "Не указано"}
          </p>
        </section>

        <section className="profile-section profile-availability">
          <h2>Календарь доступности и бронирование</h2>
          {OfferedServices && OfferedServices.length > 0 ? (
            <>
              <div className="availability-controls">
                <label htmlFor="service-select-calendar">
                  Выберите услугу:
                </label>
                <select
                  id="service-select-calendar"
                  value={selectedServiceIdForCalendar}
                  onChange={(e) => handleServiceChange(e.target.value)}
                >
                  {OfferedServices.map((service) => (
                    <option
                      key={service.service_id}
                      value={service.service_id.toString()}
                    >
                      {service.ServiceDetails?.description ||
                        service.ServiceDetails?.name ||
                        `Услуга ID ${service.service_id}`}
                    </option>
                  ))}
                </select>
              </div>

              {selectedServiceIdForCalendar && (
                <div className="calendar-container">
                  <Calendar
                    locale="ru-RU"
                    tileClassName={tileClassName}
                    tileDisabled={tileDisabled}
                    minDate={new Date()}
                    onChange={handleCalendarDateChange}
                    value={
                      isRangeBasedService ? selectedDates : selectedSingleDate
                    }
                    selectRange={isRangeBasedService}
                  />
                  <div className="calendar-legend">
                    <span className="legend-item">
                      <span className="legend-color booked-indicator"></span> -
                      Занято
                    </span>
                    <span className="legend-item">
                      <span className="legend-color selected-indicator"></span>{" "}
                      - Выбрано
                    </span>
                  </div>
                </div>
              )}

              {isUserLoggedIn && selectedServiceIdForCalendar && (
                <>
                  {!isRangeBasedService && selectedSingleDate && (
                    <div className="time-slots-and-booking-form">
                      <h4>
                        Доступные слоты на{" "}
                        {selectedSingleDate.toLocaleDateString("ru-RU")}
                      </h4>
                      {isLoadingSlots && (
                        <p className="loading-message">Загрузка слотов...</p>
                      )}
                      {!isLoadingSlots && timeSlots.length > 0 && (
                        <>
                          <div className="form-group booking-field">
                            <label htmlFor="start-time-select">
                              Выберите время начала:
                            </label>
                            <select
                              id="start-time-select"
                              value={selectedStartTime}
                              onChange={(e) => {
                                setSelectedStartTime(e.target.value);
                                setSelectedDuration("");
                                setRepetitionType("single");
                                setRepetitionEndDate(null);
                                setBookingError(null);
                                setBookingSuccess(null);
                              }}
                              className="form-control-uniform"
                            >
                              <option value="" disabled>
                                -- Время --
                              </option>
                              {timeSlots.map((slotTime) => (
                                <option key={slotTime} value={slotTime}>
                                  {slotTime}
                                </option>
                              ))}
                            </select>
                          </div>
                          {selectedStartTime &&
                            SERVICE_DURATIONS[selectedServiceIdForCalendar] && (
                              <div className="form-group booking-field">
                                <label htmlFor="duration-select">
                                  Выберите длительность:
                                </label>
                                <select
                                  id="duration-select"
                                  value={selectedDuration}
                                  onChange={(e) => {
                                    setSelectedDuration(e.target.value);
                                    setRepetitionType("single");
                                    setRepetitionEndDate(null);
                                  }}
                                  className="form-control-uniform"
                                >
                                  <option value="" disabled>
                                    -- Длительность --
                                  </option>
                                  {SERVICE_DURATIONS[
                                    selectedServiceIdForCalendar
                                  ].map((dur) => (
                                    <option
                                      key={dur.value}
                                      value={dur.value.toString()}
                                    >
                                      {dur.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                        </>
                      )}
                      {!isLoadingSlots &&
                        timeSlots.length === 0 &&
                        !bookingError && (
                          <p className="info-message">
                            На выбранную дату нет доступных времен для начала
                            услуги.
                          </p>
                        )}

                      {selectedStartTime && selectedDuration && (
                        <>
                          <div className="booking-summary-centered">
                            <p>
                              <strong>Выбранная услуга:</strong>{" "}
                              {OfferedServices.find(
                                (s) =>
                                  s.service_id.toString() ===
                                  selectedServiceIdForCalendar
                              )?.ServiceDetails?.description || "Не найдена"}
                            </p>
                            <p>
                              <strong>Выбрано время начала:</strong>{" "}
                              {selectedStartTime}
                            </p>
                            <p>
                              <strong>Выбрана длительность:</strong>{" "}
                              {SERVICE_DURATIONS[
                                selectedServiceIdForCalendar
                              ]?.find(
                                (d) => d.value.toString() === selectedDuration
                              )?.label || ""}
                            </p>
                          </div>

                          {showRepetitionOptions && (
                            <div className="repetition-section-centered">
                              <h4 className="repetition-title-centered">
                                Повторение услуги
                              </h4>
                            </div>
                          )}

                          <div className="booking-fields-container">
                            {showRepetitionOptions && (
                              <div className="repetition-options-grid booking-field">
                                <label
                                  htmlFor="repeat-single"
                                  className="repetition-label"
                                >
                                  Только на{" "}
                                  {selectedSingleDate
                                    ? selectedSingleDate.toLocaleDateString(
                                        "ru-RU"
                                      )
                                    : "выбранную дату"}
                                </label>
                                <div className="repetition-input-area">
                                  <input
                                    type="radio"
                                    id="repeat-single"
                                    name="repetitionType"
                                    value="single"
                                    checked={repetitionType === "single"}
                                    onChange={() => {
                                      setRepetitionType("single");
                                      setRepetitionEndDate(null);
                                    }}
                                  />
                                </div>

                                <label
                                  htmlFor="repeat-daily"
                                  className="repetition-label"
                                >
                                  Повторять ежедневно до:
                                </label>
                                <div className="repetition-input-area">
                                  <input
                                    type="radio"
                                    id="repeat-daily"
                                    name="repetitionType"
                                    value="daily"
                                    checked={repetitionType === "daily"}
                                    onChange={() => setRepetitionType("daily")}
                                  />
                                  {repetitionType === "daily" && (
                                    <input
                                      type="date"
                                      id="repetition-end-date"
                                      className="form-control-uniform"
                                      value={
                                        repetitionEndDate
                                          ? `${repetitionEndDate.getUTCFullYear()}-${(
                                              repetitionEndDate.getUTCMonth() +
                                              1
                                            )
                                              .toString()
                                              .padStart(
                                                2,
                                                "0"
                                              )}-${repetitionEndDate
                                              .getUTCDate()
                                              .toString()
                                              .padStart(2, "0")}`
                                          : ""
                                      }
                                      min={
                                        selectedSingleDate
                                          ? `${selectedSingleDate.getUTCFullYear()}-${(
                                              selectedSingleDate.getUTCMonth() +
                                              1
                                            )
                                              .toString()
                                              .padStart(
                                                2,
                                                "0"
                                              )}-${selectedSingleDate
                                              .getUTCDate()
                                              .toString()
                                              .padStart(2, "0")}`
                                          : ""
                                      }
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          const dateString = e.target.value;
                                          const [year, month, day] = dateString
                                            .split("-")
                                            .map(Number);
                                          const newEndDateUTC = new Date(
                                            Date.UTC(year, month - 1, day)
                                          );
                                          const comparisonStartDateUTC =
                                            new Date(
                                              Date.UTC(
                                                selectedSingleDate.getFullYear(),
                                                selectedSingleDate.getMonth(),
                                                selectedSingleDate.getDate()
                                              )
                                            );
                                          if (
                                            newEndDateUTC <
                                            comparisonStartDateUTC
                                          ) {
                                            setBookingError(
                                              "Дата окончания повторения не может быть раньше даты начала."
                                            );
                                            setRepetitionEndDate(newEndDateUTC);
                                          } else {
                                            setRepetitionEndDate(newEndDateUTC);
                                            setBookingError(null);
                                          }
                                        } else {
                                          setRepetitionEndDate(null);
                                        }
                                      }}
                                      required={repetitionType === "daily"}
                                    />
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="form-group booking-field">
                              <label htmlFor="pet-select-slot">
                                Выберите питомца:
                              </label>
                              {isLoadingPets ? (
                                <p>Загрузка...</p>
                              ) : ownerPets.length > 0 ? (
                                <select
                                  id="pet-select-slot"
                                  value={selectedPetId}
                                  onChange={(e) =>
                                    setSelectedPetId(e.target.value)
                                  }
                                  required
                                  className="form-control-uniform"
                                >
                                  <option value="" disabled>
                                    -- Выберите --
                                  </option>
                                  {ownerPets.map((pet) => (
                                    <option key={pet.id} value={pet.id}>
                                      {pet.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <p>
                                  У вас нет питомцев.{" "}
                                  <Link to="/profile/pet">Добавить?</Link>
                                </p>
                              )}
                            </div>
                            <div className="form-group booking-field">
                              <label htmlFor="booking-notes-slot">
                                Примечания (необязательно):
                              </label>
                              <textarea
                                id="booking-notes-slot"
                                rows="3"
                                value={bookingNotes}
                                onChange={(e) =>
                                  setBookingNotes(e.target.value)
                                }
                                className="form-control-uniform"
                              ></textarea>
                            </div>

                            {bookingSuccess && (
                              <p className="success-message">
                                {bookingSuccess}
                              </p>
                            )}
                            {bookingError && (
                              <p className="error-message">
                                {React.isValidElement(bookingError)
                                  ? bookingError
                                  : String(bookingError)}
                              </p>
                            )}
                          </div>

                          <div className="booking-action-centered">
                            <button
                              className="button primary-button booking-submit-button"
                              onClick={handleBookingSubmit}
                              disabled={
                                isBooking ||
                                !selectedPetId ||
                                isLoadingPets ||
                                (ownerPets && ownerPets.length === 0) || // Проверка на существование ownerPets перед length
                                !selectedStartTime ||
                                !selectedDuration ||
                                (repetitionType === "daily" &&
                                  (!repetitionEndDate ||
                                    (repetitionEndDate &&
                                      selectedSingleDate &&
                                      new Date(
                                        repetitionEndDate.getUTCFullYear(),
                                        repetitionEndDate.getUTCMonth(),
                                        repetitionEndDate.getUTCDate()
                                      ) <
                                        new Date(
                                          selectedSingleDate.getFullYear(),
                                          selectedSingleDate.getMonth(),
                                          selectedSingleDate.getDate()
                                        ))))
                              }
                            >
                              {isBooking ? "Обработка..." : "Забронировать"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {isRangeBasedService &&
                    selectedDates &&
                    selectedDates[0] &&
                    selectedDates[1] && (
                      <div className="booking-form-section">
                        <h4>Забронировать услугу</h4>
                        <p>
                          <strong>Выбранные даты:</strong>{" "}
                          {selectedDates[0].toLocaleDateString("ru-RU")} -{" "}
                          {selectedDates[1].toLocaleDateString("ru-RU")}
                        </p>
                        <p>
                          <strong>Выбранная услуга:</strong>{" "}
                          {OfferedServices.find(
                            (s) =>
                              s.service_id.toString() ===
                              selectedServiceIdForCalendar
                          )?.ServiceDetails?.description || "Не найдена"}
                        </p>
                        <div className="form-group booking-field">
                          <label htmlFor="pet-select-range">
                            Выберите питомца:
                          </label>
                          {isLoadingPets ? (
                            <p>Загрузка...</p>
                          ) : ownerPets.length > 0 ? (
                            <select
                              id="pet-select-range"
                              value={selectedPetId}
                              onChange={(e) => setSelectedPetId(e.target.value)}
                              required
                            >
                              <option value="" disabled>
                                -- Выберите --
                              </option>
                              {ownerPets.map((pet) => (
                                <option key={pet.id} value={pet.id}>
                                  {pet.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <p>
                              У вас нет питомцев.{" "}
                              <Link to="/profile/pet">Добавить?</Link>
                            </p>
                          )}
                        </div>
                        <div className="form-group booking-field">
                          <label htmlFor="booking-notes-range">
                            Примечания (необязательно):
                          </label>
                          <textarea
                            id="booking-notes-range"
                            rows="3"
                            value={bookingNotes}
                            onChange={(e) => setBookingNotes(e.target.value)}
                          ></textarea>
                        </div>
                        {bookingSuccess && (
                          <p className="success-message">{bookingSuccess}</p>
                        )}
                        {bookingError && (
                          <p className="error-message">
                            {React.isValidElement(bookingError)
                              ? bookingError
                              : String(bookingError)}
                          </p>
                        )}
                        <div className="booking-action-centered">
                          <button
                            className="button primary-button booking-submit-button"
                            onClick={handleBookingSubmit}
                            disabled={
                              isBooking ||
                              !selectedPetId ||
                              isLoadingPets ||
                              ownerPets.length === 0
                            }
                          >
                            {isBooking ? "Обработка..." : "Забронировать"}
                          </button>
                        </div>
                      </div>
                    )}

                  {isRangeBasedService &&
                    (!selectedDates ||
                      !selectedDates[0] ||
                      !selectedDates[1]) &&
                    !isLoadingSlots &&
                    timeSlots.length === 0 && (
                      <p className="info-message">
                        Выберите диапазон дат в календаре для бронирования.
                      </p>
                    )}
                  {!isRangeBasedService &&
                    !selectedSingleDate &&
                    !isLoadingSlots &&
                    timeSlots.length === 0 && (
                      <p className="info-message">
                        Выберите дату в календаре для просмотра доступных
                        слотов.
                      </p>
                    )}
                  {!isRangeBasedService &&
                    selectedSingleDate &&
                    !selectedStartTime &&
                    timeSlots.length > 0 &&
                    !isLoadingSlots && (
                      <p className="info-message">
                        Выберите доступное время начала.
                      </p>
                    )}
                  {!isRangeBasedService &&
                    selectedSingleDate &&
                    selectedStartTime &&
                    !selectedDuration &&
                    SERVICE_DURATIONS[selectedServiceIdForCalendar] &&
                    !isLoadingSlots && (
                      <p className="info-message">
                        Выберите длительность услуги.
                      </p>
                    )}
                </>
              )}

              {!isUserLoggedIn && selectedServiceIdForCalendar && (
                <p className="info-message login-prompt">
                  Пожалуйста,{" "}
                  <Link to="/login" state={{ from: window.location.pathname }}>
                    войдите в систему
                  </Link>
                  , чтобы забронировать услугу.
                </p>
              )}
            </>
          ) : (
            <p>
              Работник пока не указал услуги, для которых можно показать
              календарь.
            </p>
          )}
        </section>

        <section className="profile-section profile-reviews">
          <h2>Отзывы ({review_count || 0})</h2>
          {Reviews && Reviews.length > 0 ? (
            <ul className="reviews-list">
              {Reviews.map((review) => (
                <li key={review.id} className="review-item">
                  <div className="review-header">
                    <img
                      className="reviewer-avatar"
                      src={getFullPhotoUrl(review.Reviewer?.avatarURL)}
                      alt={review.Reviewer?.first_name || "Аватар"}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DefaultAvatarPlaceholderImage;
                      }}
                    />
                    <span className="reviewer-name">
                      {review.Reviewer?.first_name || "Пользователь"}{" "}
                      {review.Reviewer?.last_name
                        ? review.Reviewer.last_name.charAt(0) + "."
                        : ""}
                    </span>
                    {review.rating !== null && review.rating !== undefined && (
                      <span className="review-rating">
                        ⭐ {parseFloat(review.rating).toFixed(1)}
                      </span>
                    )}
                    {review.createdAt && (
                      <span className="review-date">
                        {new Date(review.createdAt).toLocaleDateString("ru-RU")}
                      </span>
                    )}
                  </div>
                  {review.comment && (
                    <p className="review-comment">{review.comment}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>Отзывов пока нет.</p>
          )}
        </section>
      </main>

      {lightboxSlides.length > 0 && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          slides={lightboxSlides}
          index={lightboxIndex}
          plugins={[Captions, Thumbnails, Zoom]}
          captions={{ descriptionTextAlign: "center", descriptionMaxLines: 3 }}
          thumbnails={{ border: 1, borderColor: "white", imageFit: "cover" }}
          zoom={{
            doubleTapDelay: 300,
            doubleClickDelay: 300,
            maxZoomPixelRatio: 5,
          }}
        />
      )}
    </div>
  );
}

export default SitterProfilePage;
