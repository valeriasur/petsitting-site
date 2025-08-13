// backend/service/pet-service.js
const { Pet /*, PetType, User */ } = require("../models");
const ApiError = require("../exceptions/api-error");
// const fs = require('fs').promises; // Для удаления старых файлов
// const path = require('path');

class PetService {
  // ... (ваши существующие методы) ...

  // НОВЫЙ МЕТОД или модификация существующего updatePet
  async updatePetPhotos(ownerUserId, petId, newPhotoPaths) {
    // newPhotoPaths - массив строк
    const pet = await Pet.findOne({
      where: { id: petId, owner_user_id: ownerUserId },
    });

    if (!pet) {
      throw ApiError.NotFound(
        "Питомец не найден или у вас нет прав на его изменение."
      );
    }

    // Логика обновления фото:
    // Вариант 1: Полностью заменяем старые фото новыми
    pet.photo_paths = newPhotoPaths; // Если photo_paths - это массив в модели

    // Вариант 2: Добавляем новые фото к существующим (если photo_paths - массив)
    // pet.photo_paths = [...(pet.photo_paths || []), ...newPhotoPaths];
    // Убедитесь, что не дублируете и не превышаете лимит, если он есть.

    // Если у вас только одно фото (поле photo_path: DataTypes.STRING)
    // if (newPhotoPaths && newPhotoPaths.length > 0) {
    //   pet.photo_path = newPhotoPaths[0]; // Берем первое фото из массива
    // } else {
    //   pet.photo_path = null; // Если массив пуст, очищаем фото
    // }

    await pet.save();

    // Опционально: Логика удаления старых файлов с диска, если фото полностью заменяются
    // Это сложнее, если у вас массив фото, так как нужно сравнить старый и новый списки.

    return pet.get({ plain: true });
  }
}

module.exports = new PetService();
