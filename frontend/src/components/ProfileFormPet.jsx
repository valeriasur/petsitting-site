import React, { useState, useEffect } from "react";
import axios from "axios"; // Импортируем axios
import "./ProfileForm.css";
import { useOutletContext } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const getFullPhotoUrl = (relativePath) => {
  if (!relativePath) return null; // Или ваш DefaultAvatarPlaceholderImage
  if (relativePath.startsWith("http")) return relativePath; // Уже полный URL
  const cleanApiUrl = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  const cleanRelativePath = relativePath.startsWith("/")
    ? relativePath.substring(1)
    : relativePath;
  return `${cleanApiUrl}/${cleanRelativePath}`;
};

export default function ProfileFormPet() {
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [size, setSize] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Не указан");
  const [is_sterilized, setIs_sterilized] = useState(null);
  const [animal_neighborhood, setAnimal_neighborhood] = useState("");
  const [alone_home, setAlone_home] = useState("");
  const [is_vaccinated, setIs_vaccinated] = useState(null);
  const [description, setDescription] = useState("");
  const [availablePetTypes, setAvailablePetTypes] = useState([]);
  const [pet_type_id, setPet_type_id] = useState("");

  const [initialLoading, setInitialLoading] = useState(true); // Индикатор первичной загрузки данных
  const [isEditing, setIsEditing] = useState(false);
  const [petProfile, setPetProfile] = useState(null);
  const [loading, setLoading] = useState(false); // Состояние загрузки
  const [error, setError] = useState(null); // Состояние ошибки
  const [successMessage, setSuccessMessage] = useState(""); // "" - нет сообщения, "created" - создан, "updated" - обновлен

  const [selectedPhoto, setSelectedPhoto] = useState(null); // Для хранения файла
  const [photoPreview, setPhotoPreview] = useState(null); // Для URL предпросмотра

  const userData = useOutletContext();
  console.log("userData in ProfileFormPet:", userData);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedPhoto(file); // Сохраняем сам файл
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result); // URL для <img> превью
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedPhoto(null);
      // При отмене выбора файла, возвращаем превью к фото из профиля (если есть) или убираем его
      setPhotoPreview(
        petProfile?.photo_path ? getFullPhotoUrl(petProfile.photo_path) : null // А здесь getFullPhotoUrl
      );
    }
  };

  useEffect(() => {
    // Здесь можно использовать userData, если для анкеты питомца тоже нужны данные пользователя
    //  Если начальных данных о питомце нет, запрос fetchProfile здесь не нужен
  }, [userData]);

  const populateForm = (petData) => {
    if (!petData) {
      setName("");
      setBreed("");
      setSize("Не указан");
      setAge("");
      setGender("Не указан");
      setIs_sterilized(null);
      setAnimal_neighborhood("");
      setAlone_home("");
      setIs_vaccinated(null);
      setDescription("");
      setPet_type_id("");
      setPetProfile(null);
      setIsEditing(false);
      return;
    }
    // заполняем поля
    setName(petData.name || "");
    setBreed(petData.breed || "");
    setSize(petData.size || "Не указан");
    setAge(
      petData.age !== null && petData.age !== undefined
        ? String(petData.age)
        : ""
    ); // Преобразуем в строку для input
    setGender(petData.gender || "Не указан");
    setIs_sterilized(petData.is_sterilized ?? null); // Используем ?? для обработки undefined
    setAnimal_neighborhood(petData.animal_neighborhood || "");
    setAlone_home(petData.alone_home || "");
    setIs_vaccinated(petData.is_vaccinated ?? null);
    setDescription(petData.description || "");
    setPet_type_id(petData.pet_type_id || ""); // pet_type_id может быть null или числом
    setPetProfile(petData); // Сохраняем объект питомца
    setIsEditing(true); // Переключаем в режим редактирования

    // photoPreview обновится через useEffect выше, когда petProfile изменится
    // Но можно и здесь явно:
    if (petData.photo_path) {
      setPhotoPreview(getFullPhotoUrl(petData.photo_path));
    } else {
      setPhotoPreview(null);
    }
    setSelectedPhoto(null); // Сбрасываем файл, выбранный до загрузки профиля
  };

  const handlePetTypeChange = (e) => {
    setPet_type_id(Number(e.target.value));
    setError(null);
    setSuccessMessage("");
  };

  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    setError(null); // Очищаем ошибку при любом изменении ввода
    setSuccessMessage("");
  };

  const handleRadioChange = (setter, value) => () => {
    setter(value);
    setError(null); // Очищаем ошибку
    setSuccessMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isEditing && !petProfile?.id) {
      setError("ID питомца не найден для обновления.");
      return;
    }

    const method = isEditing ? "PUT" : "POST";
    const url = isEditing
      ? `http://localhost:5000/api/pets/${petProfile.id}` // PUT: обновить по ID
      : "http://localhost:5000/api/pets"; // POST: создать нового

    setLoading(true); // Включаем индикатор загрузки
    setError(null); // Сбрасываем ошибку
    setSuccessMessage("");

    const ageValue = parseInt(age, 10);
    if (isNaN(ageValue) || ageValue < 0) {
      setError("Пожалуйста, укажите корректный возраст питомца.");
      setLoading(false);
      return;
    }

    const wasEditing = isEditing; // Запоминаем режим ДО запроса
    const formData = new FormData();
    formData.append("name", name);
    formData.append("breed", breed);
    formData.append("size", size);
    formData.append("age", ageValue.toString());
    formData.append("gender", gender);

    if (is_sterilized !== null)
      formData.append("is_sterilized", String(is_sterilized));
    if (animal_neighborhood)
      formData.append("animal_neighborhood", animal_neighborhood);
    if (alone_home) formData.append("alone_home", alone_home);
    if (is_vaccinated !== null)
      formData.append("is_vaccinated", String(is_vaccinated));
    if (description) formData.append("description", description);
    if (pet_type_id) formData.append("pet_type_id", pet_type_id);

    // Добавляем фото, если оно выбрано
    if (selectedPhoto) {
      formData.append("petPhoto", selectedPhoto); // Имя поля 'petPhoto' как в multer .single()
    } else if (
      isEditing &&
      petProfile &&
      !photoPreview &&
      petProfile.photo_path
    ) {
      // Если редактируем, текущее фото было (petProfile.photo_path),
      // а превью теперь нет (photoPreview is null из-за отмены выбора нового файла),
      // это может означать, что пользователь хочет удалить фото.
      // Отправляем photo_path: null (или пустую строку, чтобы бэк понял, что нужно удалить)
      formData.append("photo_path", null); // Убедитесь, что бэкенд это обрабатывает
    }

    // const method = isEditing ? "PUT" : "POST";
    // const url = isEditing
    //   ? `${API_BASE_URL}/api/pets/${petProfile.id}`
    //   : `${API_BASE_URL}/api/pets`;

    try {
      const token = localStorage.getItem("token");
      const response = await axios({
        method,
        url,
        data: formData, // Отправляем FormData
        headers: {
          Authorization: `Bearer ${token}`,
          // 'Content-Type': 'multipart/form-data' axios установит сам для FormData
        },
      });

      setSuccessMessage(wasEditing ? "updated" : "created");
      console.log(
        "Профиль питомца успешно сохранён/обновлён:",
        response.data.pet
      );

      populateForm(response.data.pet); // Обновляем форму данными с сервера
      setSelectedPhoto(null); // Сбрасываем выбранный файл после успешной отправки
    } catch (error) {
      console.error(
        "Ошибка при сохранении профиля питомца:",
        error.response || error
      );
      setSuccessMessage("");
      setError(
        error.response?.data?.message || "Произошла ошибка при сохранении."
      );
    } finally {
      setLoading(false);
    }
  };

  // Загружаем типы животных из базы данных
  useEffect(() => {
    const fetchPetTypes = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/pet-types");
        setAvailablePetTypes(response.data);
        // setLoading(false);
      } catch (error) {
        console.error("Ошибка при загрузке типов животных:", error);
        setAvailablePetTypes([]);
        setLoading(false);
      }
    };

    fetchPetTypes();
  }, []);

  // --- Загрузка профиля питомца пользователя ---
  useEffect(() => {
    const fetchPetProfile = async () => {
      setInitialLoading(true);
      setError(null); // Сбрасываем предыдущие ошибки
      setSuccessMessage("");
      const token = localStorage.getItem("token");

      if (!token) {
        console.warn("Токен не найден, загрузка профиля питомца невозможна.");
        setIsEditing(false); // Устанавливаем режим создания
        setInitialLoading(false);
        // Можно перенаправить на логин или показать сообщение
        // setError("Пожалуйста, войдите в систему для управления питомцем.");
        return;
      }

      try {
        const response = await axios.get("http://localhost:5000/api/pets/my", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (
          response.data &&
          Array.isArray(response.data) &&
          response.data.length > 0
        ) {
          // Если массив не пустой, берем ПЕРВОГО питомца
          console.log("Найден питомец пользователя:", response.data[0]);
          populateForm(response.data[0]); // Заполняем форму данными первого питомца
        } else {
          // Массив пуст - питомец не найден, переходим в режим создания
          console.log(
            "Питомец пользователя не найден. Форма в режиме создания."
          );
          populateForm(null); // Сбрасываем/очищаем форму
        }
      } catch (err) {
        if (err.response && err.response.status === 404) {
          // Питомец не найден - нормальная ситуация, остаемся в режиме создания
          console.log(
            "Питомец пользователя не найден. Форма в режиме создания."
          );
          populateForm(null); // Сбрасываем форму на всякий случай
        } else {
          // Другая ошибка (сетевая, серверная 500 и т.д.)
          console.error("Ошибка при загрузке профиля питомца:", err);
          setError(
            err.response?.data?.message ||
              "Не удалось загрузить данные питомца."
          );
          populateForm(null); // Сбрасываем форму при ошибке
        }
      } finally {
        setInitialLoading(false); // Загрузка завершена (успешно или с ошибкой)
      }
    };

    fetchPetProfile();
    // Перезапускаем загрузку, если userData меняется (если это влияет на ID пользователя)
    // Но т.к. ID берется из токена на бэке, userData здесь не обязателен в зависимостях
  }, []); // Запускается один раз при монтировании

  // useEffect для отображения текущего фото питомца при загрузке
  useEffect(() => {
    console.log("useEffect [petProfile] triggered. petProfile:", petProfile);
    if (petProfile && petProfile.photo_path) {
      const url = getFullPhotoUrl(petProfile.photo_path);
      console.log("Setting photoPreview to URL:", url);
      setPhotoPreview(url);
    } else {
      console.log(
        "Setting photoPreview to null because no petProfile or no photo_path."
      );
      setPhotoPreview(null);
    }
    if (petProfile && petProfile.photo_path) {
      setPhotoPreview(getFullPhotoUrl(petProfile.photo_path)); // Здесь getFullPhotoUrl
    } else if (!petProfile || (petProfile && !petProfile.photo_path)) {
      setPhotoPreview(null);
    }
  }, [petProfile]);

  return (
    <>
      <h2 className="form-title">Ваш питомец</h2>
      <p>Расскажите о вашем питомце.</p>
      <div>
        <div className="form-group">
          <label htmlFor="name">Имя</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={handleInputChange(setName)}
          />
        </div>

        <div>
          <div className="form-group">
            <label htmlFor="pet_type_id">Тип</label>
            <select
              id="pet_type_id"
              value={pet_type_id}
              onChange={handlePetTypeChange}
            >
              <option value="">Выберите тип животного</option>
              {availablePetTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ===== НАЧАЛО ВСТАВЛЯЕМЫХ БЛОКОВ ДЛЯ ФОТО ===== */}

        {/* Отображение превью/текущего фото */}
        {photoPreview && (
          <div className="form-group photo-preview-area">
            <label>
              {selectedPhoto ? "Предпросмотр нового фото" : "Текущее фото"}
            </label>
            <div className="form-input-wrapper">
              {" "}
              {/* Добавим обертку для выравнивания */}
              <img
                src={photoPreview}
                alt="Питомец"
                style={{
                  width: "150px",
                  height: "150px",
                  objectFit: "cover",
                  borderRadius: "8px",
                }}
                onError={(e) => {
                  // Добавляем обработчик onError
                  console.error(
                    "Ошибка загрузки изображения для превью:",
                    photoPreview,
                    e
                  );
                  // Можно добавить стиль, чтобы показать, что изображение не загрузилось
                  e.target.style.border = "2px solid red";
                  e.target.alt = "Ошибка загрузки фото";
                }}
              />
            </div>
          </div>
        )}

        {/* Кнопка загрузки/изменения фото */}
        <div className="form-group photo-form-group">
          <label htmlFor="photo-upload-input">
            {" "}
            {/* Связываем с ID инпута */}
            {petProfile?.photo_path || photoPreview
              ? "Изменить фото"
              : "Фотография"}
          </label>
          <div className="upload-button-wrapper">
            <label htmlFor="photo-upload-input" className="upload-button">
              {petProfile?.photo_path || photoPreview
                ? "Выбрать другое фото"
                : "Добавить фото"}
            </label>
            <input
              type="file"
              id="photo-upload-input" // Уникальный ID для инпута
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePhotoChange}
            />
          </div>
        </div>
        {/* ===== КОНЕЦ ВСТАВЛЯЕМЫХ БЛОКОВ ДЛЯ ФОТО ===== */}

        <div className="form-group">
          <label htmlFor="breed">Порода</label>
          <input
            type="text"
            id="breed"
            value={breed}
            onChange={handleInputChange(setBreed)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="size">Размер</label>
          <select id="size" value={size} onChange={handleInputChange(setSize)}>
            <option value="Не указан">Не указан</option>
            <option value="Мини (до 5 кг)">Мини (до 5 кг)</option>
            <option value="Малый (5 - 10 кг)">Малый (5 - 10 кг)</option>
            <option value="Средний (10 - 20 кг)">Средний (10 - 20 кг)</option>
            <option value="Большой (20 - 40 кг)">Большой (20 - 40 кг)</option>
            <option value="Очень большой (40 и более кг)">
              Очень большой (40 и более кг)
            </option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="age">Возраст</label>
          <input
            type="number"
            id="age"
            placeholder="лет"
            value={age}
            onChange={handleInputChange(setAge)}
          />
        </div>
        <div>
          <h3>Рекомендации по уходу и другие сведения</h3>
          <p className="form-description">
            Пожалуйста, укажите максимально подробные и честные сведения о
            собаке. Это очень важно для подбора правильного догситтера и
            избежания проблем на передержке.
          </p>
          <div className="recommendations-layout">
            <textarea
              value={description}
              onChange={handleInputChange(setDescription)}
              className="pet-description-textarea"
              rows="10"
              placeholder="Опишите здесь подробно..."
            />

            <div className="placeholder-text">
              <ul>
                <p className="list-subheader">Например:</p>
                <li>- Корм (сухой корм или надо готовить)</li>
                <li>- Режим питания</li>
                <li>- Режим прогулок</li>
              </ul>
              {/* Используем p или div для заголовка подсписка */}
              <p className="list-subheader">
                Индивидуальные особенности собаки:
              </p>{" "}
              {/* или <div className="list-subheader"> */}
              <ul>
                <li>- Особенности характера</li>
                <li>- Метит ли дома? Грызет ли вещи?</li>
                <li>- Агрессия к людям/детям/животным</li>
                <li>- Убегала ли когда-либо собака?</li>
                <li>- Особые предосторожности на прогулке?</li>
                <li>- Состояние здоровья</li>
                <li>- Телефон лечащего ветеринара</li>
                <li>- Медицинские процедуры</li>
                <li>и другие рекомендации</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label>Пол</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="gender"
                value="Мужской"
                checked={gender === "Мужской"}
                onChange={handleRadioChange(setGender, "Мужской")}
              />
              Мальчик
            </label>
            <label>
              <input
                type="radio"
                name="gender"
                value="Женский"
                checked={gender === "Женский"}
                onChange={handleRadioChange(setGender, "Женский")}
              />
              Девочка
            </label>
          </div>
        </div>
        <div className="form-group">
          <label>Ваш питомец стерилизован/кастрирован?</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="is_sterilized"
                value="true"
                checked={is_sterilized === true}
                onChange={handleRadioChange(setIs_sterilized, true)}
              />
              Да
            </label>
            <label>
              <input
                type="radio"
                name="is_sterilized"
                value="false"
                checked={is_sterilized === false}
                onChange={handleRadioChange(setIs_sterilized, false)}
              />
              Нет
            </label>
            <label>
              <input
                type="radio"
                name="is_sterilized"
                value=""
                checked={is_sterilized === null}
                onChange={() => setIs_sterilized(null)}
              />
              Не знаю точно
            </label>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="animal_neighborhood">
            Какие животные могут находиться во время передержки в компании с
            вашим питомцем?{" "}
          </label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="animal_neighborhood"
                value="Никакие"
                checked={animal_neighborhood === "Никакие"}
                onChange={handleRadioChange(setAnimal_neighborhood, "Никакие")}
              />
              Никакие
            </label>
            <label>
              <input
                type="radio"
                name="animal_neighborhood"
                value="Собаки мальчики"
                checked={animal_neighborhood === "Собаки мальчики"}
                onChange={handleRadioChange(
                  setAnimal_neighborhood,
                  "Собаки мальчики"
                )}
              />
              Собаки мальчики
            </label>
            <label>
              <input
                type="radio"
                name="animal_neighborhood"
                value="Собаки девочки"
                checked={animal_neighborhood === "Собаки девочки"}
                onChange={handleRadioChange(
                  setAnimal_neighborhood,
                  "Собаки девочки"
                )}
              />
              Собаки девочки
            </label>
            <label>
              <input
                type="radio"
                name="animal_neighborhood"
                value="Кошки"
                checked={animal_neighborhood === "Кошки"}
                onChange={handleRadioChange(setAnimal_neighborhood, "Кошки")}
              />
              Кошки
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="alone_home">
            Как ваш питомец переносит одиночество дома?
          </label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="alone_home"
                value="Остается одна, пока я на работе"
                checked={alone_home === "Остается одна, пока я на работе"}
                onChange={handleRadioChange(
                  setAlone_home,
                  "Остается одна, пока я на работе"
                )}
              />
              Остается одна, пока я на работе
            </label>
            <label>
              <input
                type="radio"
                name="alone_home"
                value="Остается на пару часов"
                checked={alone_home === "Остается на пару часов"}
                onChange={handleRadioChange(
                  setAlone_home,
                  "Остается на пару часов"
                )}
              />
              Остается на пару часов
            </label>
            <label>
              <input
                type="radio"
                name="alone_home"
                value="Почти всегда дома кто то есть"
                checked={alone_home === "Почти всегда дома кто то есть"}
                onChange={handleRadioChange(
                  setAlone_home,
                  "Почти всегда дома кто то есть"
                )}
              />
              Почти всегда дома кто то есть
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="vaccination">Есть ли у питомца прививки?</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="is_vaccinated"
                value="true"
                checked={is_vaccinated === true}
                onChange={handleRadioChange(setIs_vaccinated, true)}
              />
              Да
            </label>
            <label>
              <input
                type="radio"
                name="is_vaccinated"
                value="false"
                checked={is_vaccinated === false}
                onChange={handleRadioChange(setIs_vaccinated, false)}
              />
              Нет
            </label>
            <label>
              <input
                type="radio"
                name="is_vaccinated"
                value=""
                checked={is_vaccinated === null}
                onChange={() => setIs_vaccinated(null)}
              />
              Не знаю точно
            </label>
          </div>
        </div>
        {error && <p className="error-message">{error}</p>}
        {/* Отображение динамического сообщения об успехе */}
        {successMessage && (
          <p className="success-message">
            {successMessage === "created"
              ? "Профиль питомца успешно создан!"
              : "Профиль питомца успешно обновлен!"}
          </p>
        )}
        <button
          className="save-button"
          type="submit"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </>
  );
}
