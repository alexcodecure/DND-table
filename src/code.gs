// Основная функция обработки изменений в таблице
function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var sheetName = sheet.getName();

  // Обработка изменений на листе "Инициатива"
  if (sheetName === "Инициатива") {
    onEditInitiative(e);
  }

  // Обработка изменений на листе "Список игроков"
  if (sheetName === "Список игроков") {
    handlePlayerListEdit(e);
  }

  // Обновление выпадающих списков при изменениях в списках игроков, НПС или монстров
  if (["Список игроков", "Список НПС", "Список монстров"].includes(sheetName)) {
    updateDropdowns();
  }
}
function onEditInitiative(e) {
  var sheet = e.source.getActiveSheet();
  if (sheet.getName() !== "Инициатива") return; // Проверка: работаем только на "Инициатива"
  var range = e.range;
  var row = range.getRow();
  var col = range.getColumn();

  // Логирование для отладки
  Logger.log(`Редактируемая ячейка: строка ${row}, столбец ${col}`);
  if (row < 3 || row > 25) return; // Ограничение: строки с 3 по 25

  // 1. Сортировка по инициативе
  if (col === 1) {
    sortInitiative(); // Сортировка строк
  }

  // 2. Галочки
  if (col === 4) {
    handleCheckboxes(e); // Управление галочками
  }

  // 3. Здоровье
  if (col === 6 || col === 7) {
    updateHealth(e); // Работа с ХП
  }

  // 4. Обработка выпадающих списков в столбце B
  if (col === 2) {
    handleDropdowns(e); // Функция обработки выпадающих списков

    // Дополнительно: обновляем текущий ХП после выбора персонажа
    var maxHpRange = sheet.getRange(row, 6); // Столбец F (Максимальное ХП)
    var hpRange = sheet.getRange(row, 9); // Столбец I (Текущее ХП)
    if (!maxHpRange.isBlank()) {
      var maxHp = Number(maxHpRange.getValue());
      if (!isNaN(maxHp)) {
        hpRange.setValue(`${maxHp}/${maxHp}`); // Устанавливаем текущее здоровье как "максимальное/максимальное"
        hpRange.setBackground("#99FF99").setFontColor("black"); // Светло-зеленый
      }
    }

    // Добавляем окрашивание ячейки в зависимости от типа персонажа
    var value = range.getValue();
    Logger.log(`Выбранное значение: ${value}`); // Логирование для отладки
    var players = getPlayersList(); // Получаем список игроков
    var npcs = getNpcList(); // Получаем список НПС
    Logger.log(`Игроки: ${players.join(", ")}`); // Логирование для отладки
    Logger.log(`НПС: ${npcs.join(", ")}`); // Логирование для отладки
    if (players.includes(value)) {
      range.setBackground("#ADD8E6"); // Нежно-голубой цвет для игроков
      Logger.log("Окрашено в голубой: игрок");
    } else if (npcs.includes(value)) {
      range.setBackground("#D8BFD8"); // Нежно-фиолетовый цвет для НПС
      Logger.log("Окрашено в фиолетовый: НПС");
    } else {
      range.setBackground(null); // Убираем фон для других значений
      Logger.log("Фон сброшен: другое значение");
    }
  }
}
// Сортировка строк по инициативе
function sortInitiative() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Инициатива");
  if (!sheet) return;

  // Определяем диапазон данных (строки 3–25)
  var range = sheet.getRange(3, 1, 23, sheet.getLastColumn()); // Данные с 3 по 25 строку
  var data = range.getValues(); // Загружаем значения

  // Загружаем цвета фона для всего диапазона
  var backgroundColors = range.getBackgrounds(); // Цвета фона всех ячеек

  // Сортируем данные по столбцу A (инициатива)
  var indexedData = data.map((row, index) => ({ row, index })); // Добавляем индекс строк
  indexedData.sort((a, b) => (Number(b.row[0]) || 0) - (Number(a.row[0]) || 0)); // Сортировка по убыванию

  // Применяем сортировку к данным и цветам
  var sortedData = indexedData.map(item => item.row); // Отсортированные данные
  var sortedBackgroundColors = indexedData.map(item => backgroundColors[item.index]); // Отсортированные цвета

  // Устанавливаем отсортированные данные и цвета
  range.setValues(sortedData); // Устанавливаем отсортированные данные
  range.setBackgrounds(sortedBackgroundColors); // Восстанавливаем цвета фона
}
// Управление галочками в столбце D
function handleCheckboxes(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  var row = range.getRow();
  var checkboxRange = sheet.getRange(3, 4, 23); // Диапазон галочек
  var checkboxes = checkboxRange.getValues();

  // Сбрасываем все галочки, кроме текущей
  for (var i = 0; i < checkboxes.length; i++) {
    if (i + 3 === row) continue;
    checkboxes[i][0] = false;
  }
  checkboxRange.setValues(checkboxes);
}
// Функция здоровья
function updateHealth(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  var row = range.getRow();
  var col = range.getColumn();

  // Убедимся, что мы работаем на вкладке "Инициатива"
  if (sheet.getName() !== "Инициатива") return;

  // Работаем только с 3 по 25 строки и столбцами F (Макс ХП) и G (Урон/Лечение)
  if (row < 3 || row > 25 || (col !== 6 && col !== 7)) return;

  var maxHpCell = sheet.getRange(row, 6); // Столбец F (Макс ХП)
  var damageCell = sheet.getRange(row, 7); // Столбец G (Урон/Лечение)
  var totalDamageCell = sheet.getRange(row, 8); // Столбец H (Итоговый урон)
  var hpCell = sheet.getRange(row, 9); // Столбец I (ХП)

  // Цвета по умолчанию для ячеек
  var defaultColors = {
    maxHp: "#C6DF90", // Зеленый
    damage: "#FFB28B", // Лососевый
    totalDamage: "#FED6BC", // Красный
    hp: "#FFF0F5" // Розовый
  };

  if (col === 6) { // Изменено значение в "Максимальное ХП"
    if (maxHpCell.isBlank()) {
      // Если "Максимальное ХП" очищено, очищаем остальные ячейки и возвращаем им оригинальные цвета
      maxHpCell.setBackground(defaultColors.maxHp).setFontColor("black");
      damageCell.clearContent().setBackground(defaultColors.damage);
      totalDamageCell.clearContent().setBackground(defaultColors.totalDamage);
      hpCell.clearContent().setBackground(defaultColors.hp).setFontColor("black");
    } else {
      // Устанавливаем "ХП" как "Макс ХП/Макс ХП"
      var maxHp = Number(maxHpCell.getValue());
      hpCell.setValue(maxHp + "/" + maxHp);
    }
  }

  if (col === 7) { // Изменено значение в "Урон/Лечение"
    if (maxHpCell.isBlank()) return; // Если нет значения в "Макс ХП", ничего не делаем

    var maxHp = Number(maxHpCell.getValue());
    var currentHp = hpCell.getValue() ? Number(hpCell.getValue().split("/")[0]) : 0; // Извлекаем текущее ХП
    var damage = Number(damageCell.getValue());

    if (!isNaN(damage)) {
      if (damage > 0) {
        // Урон
        totalDamageCell.setValue((Number(totalDamageCell.getValue()) || 0) + damage);
        currentHp -= damage;
      } else {
        // Лечение
        currentHp = Math.min(maxHp, currentHp - damage); // Лечение не превышает "Макс ХП"
      }

      // Обновляем значение ХП
      hpCell.setValue(Math.max(currentHp, -maxHp) + "/" + maxHp);

      // Окрашиваем ячейки
      if (currentHp <= -maxHp) {
        // Если ХП <= -Макс ХП
        sheet.getRange(row, 6, 1, 4).setBackground("black").setFontColor("white"); // Столбцы F–I черный фон, белый текст
      } else if (currentHp <= 0) {
        // Если ХП 0 или меньше
        hpCell.setBackground("black").setFontColor("red");
        maxHpCell.setBackground(defaultColors.maxHp).setFontColor("black"); // Восстанавливаем цвет Макс ХП
      } else {
        // Восстанавливаем динамическое окрашивание для положительного ХП
        var healthPercentage = (currentHp / maxHp) * 100;
        if (healthPercentage > 70) {
          hpCell.setBackground("#99FF99").setFontColor("black"); // Светло-зеленый
        } else if (healthPercentage > 40) {
          hpCell.setBackground("#FCE883").setFontColor("black"); // Желтый
        } else {
          hpCell.setBackground("#E4717A").setFontColor("black"); // Красный
        }
        maxHpCell.setBackground(defaultColors.maxHp).setFontColor("black"); // Восстанавливаем цвет Макс ХП
      }

      // Очищаем "Урон/Лечение"
      damageCell.clearContent();
    }
  }
}
// Кнопка очистки
function clearAll() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Инициатива");
  if (!sheet) return;
  
  // Очищаем значения в строках 3–25
  sheet.getRange(3, 1, 23, sheet.getLastColumn()).clearContent();
  
  // Устанавливаем базовые цвета для столбцов F, G, H, I
  var maxHpColumn = sheet.getRange(3, 6, 23, 1); // Столбец F
  var damageColumn = sheet.getRange(3, 7, 23, 1); // Столбец G
  var totalDamageColumn = sheet.getRange(3, 8, 23, 1); // Столбец H
  var currentHpColumn = sheet.getRange(3, 9, 23, 1); // Столбец I
  
  // Устанавливаем цвета
  maxHpColumn.setBackground("#C6DF90").setFontColor("black"); // Тёмно-зелёный фон, чёрный текст
  damageColumn.setBackground("#FFB28B").setFontColor("black"); // Светло-лососевый фон, чёрный текст
  totalDamageColumn.setBackground("#FED6BC").setFontColor("black"); // Томато-фон, белый текст
  currentHpColumn.setBackground("#FFF0F5").setFontColor("black"); // Розовый фон, чёрный текст
  
  // Сбрасываем цвет в столбце B (Имена)
  var nameColumn = sheet.getRange(3, 2, 23, 1); // Столбец B, строки 3–25
  nameColumn.setBackground(null).setFontColor("black"); // Возвращаем белый фон и чёрный текст
  
  // Сбрасываем галочки в столбцах D (Ход) и K (Концентрация)
  var checkboxRanges = [
    sheet.getRange(3, 4, 23, 1), // Столбец D (Ход)
    sheet.getRange(3, 11, 23, 1) // Столбец K (Концентрация)
  ];
  checkboxRanges.forEach(function(range) {
    range.uncheck();
  });
  
  // Очищаем значение в ячейке M26
  sheet.getRange("M26").clearContent();
}
// Обработка выбора из выпадающих списков
function handleDropdowns(e) {
  var sheet = e.source.getActiveSheet();
  if (sheet.getName() !== "Инициатива") return;
  var range = e.range;
  var col = range.getColumn();
  var row = range.getRow();

  // Проверяем, работаем ли в столбце B (столбец C больше не используется)
  if (col === 2) {
    var selectedValue = range.getValue(); // Значение, выбранное в выпадающем списке
    if (!selectedValue) return; // Если значение пустое, ничего не делаем

    var sourceSheet;
    var foundRow = null;

    // Определяем, на каком листе искать данные
    var sheetsToSearch = ["Список игроков", "Список НПС", "Список монстров"];
    for (var i = 0; i < sheetsToSearch.length; i++) {
      sourceSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetsToSearch[i]);
      if (!sourceSheet) continue;

      var data = sourceSheet.getRange(2, 2, sourceSheet.getLastRow() - 1, 1).getValues().flat().filter(String);

      // Ищем строку, где находится выбранное значение
      foundRow = data.indexOf(selectedValue) + 2; // +2 для учёта заголовков
      if (foundRow > 1) break; // Если нашли значение, выходим из цикла
    }

    if (foundRow && sourceSheet) {
      // Копируем данные в текущую строку
      var kd = sourceSheet.getRange(foundRow, 6).getValue(); // Столбец F -> КД
      var maxHp = sourceSheet.getRange(foundRow, 7).getValue(); // Столбец G -> Максимальное ХП
      var speed = sourceSheet.getRange(foundRow, 8).getValue(); // Столбец H -> Скорость
      var notes = sourceSheet.getRange(foundRow, 12).getValue(); // Столбец K -> Примечания

      sheet.getRange(row, 5).setValue(kd); // E -> КД
      sheet.getRange(row, 6).setValue(maxHp); // F -> Максимальное ХП
      sheet.getRange(row, 10).setValue(speed); // J -> Скорость
      sheet.getRange(row, 13).setValue(notes); // M -> Примечания

      // Окрашиваем ячейку в зависимости от типа выбранного значения
      if (sheetsToSearch.indexOf("Список игроков") === i) {
        range.setBackground("#ADD8E6").setFontColor("black"); // Игроки
      } else if (sheetsToSearch.indexOf("Список НПС") === i) {
        range.setBackground("#D8BFD8").setFontColor("black"); // НПС
      } else {
        range.setBackground(null).setFontColor("black"); // Монстры
      }
    } else {
      // Если персонаж не найден, очищаем связанные ячейки
      sheet.getRange(row, 5, 1, 9).clearContent(); // Очищаем столбцы E, F, J, M
      range.setBackground(null).setFontColor("black"); // Сбрасываем цвет ячейки
    }
  }
}
// Обновление списка игроков через кнопку
function updatePlayerList() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var playerSheet = spreadsheet.getSheetByName("Список игроков");
  if (!playerSheet) {
    SpreadsheetApp.getUi().alert("Лист 'Список игроков' не найден!");
    return;
  }

  // Очищаем таблицу: столбцы A и B (игроки и персонажи)
  var rangeToClearAB = playerSheet.getRange(2, 1, 5, 2); // Диапазон A2:B6
  var backgroundColorsAB = rangeToClearAB.getBackgrounds(); // Сохраняем цвета фона

  // Очищаем столбцы C–L (строки 2–6)
  var rangeToClearCL = playerSheet.getRange(2, 3, 5, 9); // Диапазон C2:L6
  var backgroundColorsCL = rangeToClearCL.getBackgrounds(); // Сохраняем цвета фона

  // Очищаем содержимое ячеек
  rangeToClearAB.clearContent();
  rangeToClearCL.clearContent();

  // Восстанавливаем цвета фона
  rangeToClearAB.setBackgrounds(backgroundColorsAB);
  rangeToClearCL.setBackgrounds(backgroundColorsCL);

  // Получаем список всех листов с игроками
  var sheets = spreadsheet.getSheets();
  var playerNames = sheets
    .map(sheet => sheet.getName().startsWith("Игрок ") ? sheet.getName().replace("Игрок ", "") : null)
    .filter(Boolean);

  if (playerNames.length === 0) {
    SpreadsheetApp.getUi().alert("Листы с игроками не найдены!");
    return;
  }

  // Устанавливаем выпадающий список игроков в столбце A (строки 2–7)
  var playerRange = playerSheet.getRange(2, 1, 6); // Диапазон A2:A7
  var playerRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(playerNames, true)
    .setAllowInvalid(false)
    .build();

  playerRange.setDataValidation(playerRule);
}
// Обработка изменений на листе "Список игроков"
function handlePlayerListEdit(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  var row = range.getRow();
  var col = range.getColumn();

  // Если изменён игрок в столбце A
  if (col === 1 && row >= 2 && row <= 7) { // Ограничение: строки с 2 по 7
    var playerName = range.getValue();
    if (!playerName) {
      // Если игрок удалён, очищаем столбец B и его валидацию
      sheet.getRange(row, 2).clearContent().clearDataValidations();
      return;
    }

    // Находим соответствующую вкладку игрока
    var playerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Игрок " + playerName);
    if (playerSheet) {
      var characterNames = playerSheet.getRange(2, 2, playerSheet.getLastRow() - 1).getValues().flat().filter(String);
      if (characterNames.length > 0) {
        // Устанавливаем выпадающий список персонажей в столбце B
        var characterRange = sheet.getRange(row, 2);
        var characterRule = SpreadsheetApp.newDataValidation()
          .requireValueInList(characterNames, true)
          .setAllowInvalid(false)
          .build();
        characterRange.setDataValidation(characterRule);
      } else {
        // Если у игрока нет персонажей, очищаем столбец B
        sheet.getRange(row, 2).clearContent().clearDataValidations();
      }
    }
  }

  // Если выбран персонаж в столбце B
  if (col === 2 && row >= 2 && row <= 7) { // Ограничение: строки с 2 по 7
    var playerName = sheet.getRange(row, 1).getValue(); // Имя игрока
    var characterName = range.getValue(); // Имя персонажа

    if (!playerName || !characterName) return;

    // Находим соответствующую вкладку игрока
    var playerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Игрок " + playerName);
    if (playerSheet) {
      var data = playerSheet.getRange(2, 2, playerSheet.getLastRow() - 1, 11).getValues(); // Столбцы B–L
      var foundRow = null;

      for (var r = 0; r < data.length; r++) {
        if (data[r][0] === characterName) {
          foundRow = r + 2; // Строка, где нашли персонажа
          break;
        }
      }

      if (foundRow) {
        // Копируем данные в текущую строку
        sheet.getRange(row, 3).setValue(playerSheet.getRange(foundRow, 3).getValue()); // C -> C
        sheet.getRange(row, 4).setValue(playerSheet.getRange(foundRow, 4).getValue()); // D -> D
        sheet.getRange(row, 5).setValue(playerSheet.getRange(foundRow, 5).getValue()); // E -> E
        sheet.getRange(row, 6).setValue(playerSheet.getRange(foundRow, 6).getValue()); // F -> F
        sheet.getRange(row, 7).setValue(playerSheet.getRange(foundRow, 7).getValue()); // G -> G
        sheet.getRange(row, 8).setValue(playerSheet.getRange(foundRow, 8).getValue()); // H -> H
        sheet.getRange(row, 9).setValue(playerSheet.getRange(foundRow, 9).getValue()); // I -> I
        sheet.getRange(row, 10).setValue(playerSheet.getRange(foundRow, 10).getValue()); // J -> J
        sheet.getRange(row, 11).setValue(playerSheet.getRange(foundRow, 11).getValue()); // K -> K
        sheet.getRange(row, 12).setValue(playerSheet.getRange(foundRow, 12).getValue()); // L -> L
      } else {
        // Если персонаж не найден, очищаем связанные ячейки
        sheet.getRange(row, 3, 1, 10).clearContent(); // Очищаем столбцы C–L
      }
    }
  }
}
// Очистка НПС и монстров
function removeNonPlayers() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var initiativeSheet = spreadsheet.getSheetByName("Инициатива");
  var playerSheet = spreadsheet.getSheetByName("Список игроков");
  if (!initiativeSheet || !playerSheet) return;

  // Получаем список имен игроков из "Список игроков"
  var playerNames = playerSheet.getRange(2, 2, playerSheet.getLastRow() - 1, 1) // Столбец B
    .getValues()
    .flat()
    .filter(String); // Убираем пустые строки

  // Цвета для столбцов F–I
  var defaultColors = {
    maxHp: "#C6DF90", // Пастельный зеленый
    damage: "#FFB28B", // Пастельный лососевый
    totalDamage: "#FED6BC", // Пастельный оранжевый
    currentHp: "#FFF0F5" // Пастельный розовый
  };

  // Проверяем строки на листе "Инициатива"
  for (var row = 3; row <= 25; row++) {
    var nameCell = initiativeSheet.getRange(row, 2); // Столбец B (Имя)
    var name = nameCell.getValue();

    // Если имя не найдено в списке игроков, очищаем строку и восстанавливаем цвета
    if (playerNames.indexOf(name) === -1) {
      // Очищаем всю строку
      initiativeSheet.getRange(row, 1, 1, initiativeSheet.getLastColumn()).clearContent();

      // Восстанавливаем цвета для столбцов F–I
      initiativeSheet.getRange(row, 6).setBackground(defaultColors.maxHp).setFontColor("black"); // Столбец F
      initiativeSheet.getRange(row, 7).setBackground(defaultColors.damage).setFontColor("black"); // Столбец G
      initiativeSheet.getRange(row, 8).setBackground(defaultColors.totalDamage).setFontColor("black"); // Столбец H
      initiativeSheet.getRange(row, 9).setBackground(defaultColors.currentHp).setFontColor("black"); // Столбец I

      // Сбрасываем цвет фона в столбце B (Имя) на белый
      nameCell.setBackground(null);
    }
  }
}
// Автоматическое обновление данных на листе "Инициатива" через кнопку
function autoUpdateInitiative() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var initiativeSheet = spreadsheet.getSheetByName("Инициатива");
  var playerSheet = spreadsheet.getSheetByName("Список игроков");
  var npcSheet = spreadsheet.getSheetByName("Список НПС");
  var monsterSheet = spreadsheet.getSheetByName("Список монстров");

  if (!initiativeSheet || !playerSheet || !npcSheet || !monsterSheet) {
    SpreadsheetApp.getUi().alert("Необходимые листы не найдены!");
    return;
  }

  // Шаг 1: Обновляем выпадающие списки
  updateDropdowns();

  // Шаг 2: Очищаем старые данные на листе "Инициатива"
  initiativeSheet.getRange(3, 1, 23, initiativeSheet.getLastColumn()).clearContent();

  // Шаг 3: Восстанавливаем базовые цвета для столбцов F–I
  var defaultColors = {
    maxHp: "#C6DF90", // Зеленый
    damage: "#FFB28B", // Лососевый
    totalDamage: "#FED6BC", // Красный
    currentHp: "#FFF0F5" // Розовый
  };
  initiativeSheet.getRange(3, 6, 23, 1).setBackground(defaultColors.maxHp).setFontColor("black"); // Столбец F
  initiativeSheet.getRange(3, 7, 23, 1).setBackground(defaultColors.damage).setFontColor("black"); // Столбец G
  initiativeSheet.getRange(3, 8, 23, 1).setBackground(defaultColors.totalDamage).setFontColor("black"); // Столбец H
  initiativeSheet.getRange(3, 9, 23, 1).setBackground(defaultColors.currentHp).setFontColor("black"); // Столбец I

  // Шаг 4: Подтягиваем данные из выпадающих списков
  for (var row = 3; row <= 25; row++) {
    var nameCell = initiativeSheet.getRange(row, 2); // Столбец B (Имя)
    var selectedValue = nameCell.getValue(); // Выбранное значение

    if (!selectedValue) continue; // Пропускаем пустые строки

    var sourceSheet;
    var foundRow = null;

    // Определяем, на каком листе искать данные
    var sheetsToSearch = ["Список игроков", "Список НПС", "Список монстров"];
    for (var i = 0; i < sheetsToSearch.length; i++) {
      sourceSheet = spreadsheet.getSheetByName(sheetsToSearch[i]);
      if (!sourceSheet) continue;

      var data = sourceSheet.getRange(2, 2, sourceSheet.getLastRow() - 1, 1).getValues(); // Столбец B
      for (var r = 0; r < data.length; r++) {
        if (data[r][0] === selectedValue) {
          foundRow = r + 2; // Строка, где нашли персонажа (с учётом заголовков)
          break;
        }
      }

      if (foundRow) break; // Если нашли значение, выходим из цикла
    }

    if (foundRow && sourceSheet) {
      // Копируем данные в текущую строку
      var kd = sourceSheet.getRange(foundRow, 6).getValue(); // Столбец F -> КД
      var maxHp = sourceSheet.getRange(foundRow, 7).getValue(); // Столбец G -> Максимальное ХП
      var speed = sourceSheet.getRange(foundRow, 8).getValue(); // Столбец H -> Скорость
      var notes = sourceSheet.getRange(foundRow, 12).getValue(); // Столбец K -> Примечания
      initiativeSheet.getRange(row, 5).setValue(kd); // E -> КД
      initiativeSheet.getRange(row, 6).setValue(maxHp); // F -> Максимальное ХП
      initiativeSheet.getRange(row, 10).setValue(speed); // J -> Скорость
      initiativeSheet.getRange(row, 13).setValue(notes); // M -> Примечания

      // Окрашиваем строку в зависимости от типа выбранного значения
      if (sheetsToSearch.indexOf("Список игроков") === i) {
        // Если это игрок, окрашиваем строку в синий цвет
        initiativeSheet.getRange(row, 1, 1, initiativeSheet.getLastColumn()).setBackground("#ADD8E6").setFontColor("black");
      } else {
        // Если это НПС или монстр, сбрасываем цвет на стандартный
        initiativeSheet.getRange(row, 1, 1, initiativeSheet.getLastColumn()).setBackground(null).setFontColor("black");
      }
    } else {
      // Если персонаж не найден, очищаем связанные ячейки
      initiativeSheet.getRange(row, 5, 1, 9).clearContent(); // Очищаем столбцы E, F, J, M
    }
  }
}
// Выпадающие списки
function updateDropdowns() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var initiativeSheet = spreadsheet.getSheetByName("Инициатива");
  if (!initiativeSheet) return;

  // Источники данных
  var playerSheet = spreadsheet.getSheetByName("Список игроков");
  var npcSheet = spreadsheet.getSheetByName("Список НПС");
  var monsterSheet = spreadsheet.getSheetByName("Список монстров");
  if (!playerSheet || !npcSheet || !monsterSheet) return;

  // Получение данных из столбцов B
  var players = playerSheet.getRange(2, 2, playerSheet.getLastRow() - 1).getValues().flat().filter(String);
  var npcs = npcSheet.getRange(2, 2, npcSheet.getLastRow() - 1).getValues().flat().filter(String);
  var monsters = monsterSheet.getRange(2, 2, monsterSheet.getLastRow() - 1).getValues().flat().filter(String);

  // Объединяем данные: Игроки → НПС → Монстры
  var dropdownValues = players.concat(npcs, monsters);

  // Устанавливаем выпадающие списки только в столбец B (строки 3–25)
  var range = initiativeSheet.getRange(3, 2, 23); // Диапазон B3:B25
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(dropdownValues, true)
    .build();

  range.setDataValidation(rule);
}
// Функция для расчета итогового опыта (XP) на листе "Инициатива"
function calculateTotalXP() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var initiativeSheet = spreadsheet.getSheetByName("Инициатива");
  var npcSheet = spreadsheet.getSheetByName("Список НПС");
  var monsterSheet = spreadsheet.getSheetByName("Список монстров");

  if (!initiativeSheet || !npcSheet || !monsterSheet) {
    SpreadsheetApp.getUi().alert("Необходимые листы не найдены!");
    return;
  }

  // Таблица соответствия "Показатель опасности" -> XP
  var xpTable = {
    "0": 10,
    "1/8": 25,
    "1/4": 50,
    "1/2": 100,
    "1": 200,
    "2": 450,
    "3": 700,
    "4": 1100,
    "5": 1800,
    "6": 2300,
    "7": 2900,
    "8": 3900,
    "9": 5000,
    "10": 5900,
    "11": 7200,
    "12": 8400,
    "13": 10000,
    "14": 11500,
    "15": 13000,
    "16": 15000,
    "17": 18000,
    "18": 20000,
    "19": 22000,
    "20": 25000,
    "21": 33000,
    "22": 41000,
    "23": 50000,
    "24": 62000,
    "25": 75000,
    "26": 90000,
    "27": 105000,
    "28": 120000,
    "29": 135000,
    "30": 155000
  };

  // Получаем все имена НПС и монстров на листе "Инициатива"
  var initiativeNames = initiativeSheet.getRange(3, 2, 23, 2).getValues().flat().filter(String);

  // Инициализируем переменную для суммирования XP
  var totalXP = 0;

  // Проходим по всем именам на листе "Инициатива"
  initiativeNames.forEach(function(name) {
    var sourceSheet;
    var foundRow = null;

    // Определяем, на каком листе искать данные
    var sheetsToSearch = ["Список НПС", "Список монстров"];
    for (var i = 0; i < sheetsToSearch.length; i++) {
      sourceSheet = spreadsheet.getSheetByName(sheetsToSearch[i]);
      if (!sourceSheet) continue;

      var data = sourceSheet.getRange(2, 2, sourceSheet.getLastRow() - 1, 1).getValues(); // Столбец B
      for (var r = 0; r < data.length; r++) {
        if (data[r][0] === name) {
          foundRow = r + 2; // Строка, где нашли персонажа (с учётом заголовков)
          break;
        }
      }

      if (foundRow) break; // Если нашли значение, выходим из цикла
    }

    // Если персонаж найден, получаем его показатель опасности
    if (foundRow && sourceSheet) {
      var dangerLevel = sourceSheet.getRange(foundRow, 1).getValue(); // Столбец A (Показатель опасности)
      var xp = xpTable[dangerLevel.toString()] || 0; // Находим XP в таблице
      totalXP += xp; // Добавляем XP к общей сумме
    }
  });

  // Записываем итоговый XP в объединенные ячейки K26:M26
  initiativeSheet.getRange("M26").setValue(totalXP).setNumberFormat("#,##0"); // Форматируем число с разделителями
}
//Кнопка лечения
function healByDamage() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var initiativeSheet = spreadsheet.getSheetByName("Инициатива");
  if (!initiativeSheet) {
    SpreadsheetApp.getUi().alert("Лист 'Инициатива' не найден!");
    return;
  }

  // Определяем диапазон для столбца H (Итоговый урон)
  var totalDamageRange = initiativeSheet.getRange(3, 8, 23); // Столбец H, строки 3–25
  var totalDamageValues = totalDamageRange.getValues(); // Получаем значения из столбца H

  // Проходим по каждой строке
  for (var i = 0; i < totalDamageValues.length; i++) {
    var totalDamage = totalDamageValues[i][0]; // Значение в столбце H

    // Если в столбце H есть урон (значение больше 0)
    if (totalDamage > 0) {
      var row = i + 3; // Номер строки (учитываем смещение на 3 строки)

      // Получаем максимальное здоровье из столбца F
      var maxHpCell = initiativeSheet.getRange(row, 6); // Столбец F (Максимальное ХП)
      var maxHp = Number(maxHpCell.getValue());

      // Если максимальное здоровье существует, обновляем текущее здоровье
      if (!isNaN(maxHp)) {
        // Вызываем функцию updateHealth для пересчета здоровья
        var fakeEvent = {
          source: { getActiveSheet: () => initiativeSheet },
          range: initiativeSheet.getRange(row, 7) // Столбец G (Урон/Лечение)
        };
        fakeEvent.range.setValue(-totalDamage); // Устанавливаем отрицательное значение урона
        updateHealth(fakeEvent); // Обновляем здоровье
      }
    }
  }

  // Очищаем столбец H (Итоговый урон)
  totalDamageRange.clearContent();

  SpreadsheetApp.getUi().alert("Лечение выполнено!");
}
