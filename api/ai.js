export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
      type,
      text = "",
      imageUrl = null,
      question = "",
      fileName = ""
    } = req.body || {};

    const cleanText =
      typeof text === "string"
        ? text.trim().slice(0, 30000)
        : "";

    const cleanQuestion =
      typeof question === "string"
        ? question.trim().slice(0, 5000)
        : "";

    if (!cleanText && !imageUrl) {
      return res.status(400).json({
        error: "Учебный материал пустой."
      });
    }

    if (type === "chat" && !cleanQuestion) {
      return res.status(400).json({
        error: "Вопрос пустой."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error:
          "На сервере не настроен GEMINI_API_KEY. Проверь Vercel → Settings → Environment Variables."
      });
    }

    const prompts = {
      summary: `
Ты — AI-помощник для учёбы StudyFish.

Изучи учебный материал и сделай понятный школьный конспект.

Правила:
- Используй только информацию из материала.
- Не придумывай факты.
- Игнорируй имя преподавателя.
- Игнорируй дату.
- Игнорируй номер урока.
- Игнорируй класс и другие служебные данные.
- Не превращай название файла в учебное понятие.
- Не используй случайные обрывки текста.

Структура:

# Главная тема

Кратко объясни тему.

# Основные понятия

Термин — понятное определение.

# Главное

Самые важные правила, свойства и факты.

# Что нужно запомнить

Короткий список главного.

Пиши на русском языке.
Пиши понятно школьнику.
`,

      quiz: `
Ты создаёшь школьный тест для StudyFish.

Создай 10 качественных вопросов по предоставленному учебному материалу.

Строго:
- Только информация из материала.
- Не используй имя преподавателя.
- Не используй дату.
- Не используй номер урока.
- Не используй название файла.
- Не используй служебные данные.
- Не используй обрывки предложений.
- Не придумывай факты.
- Один правильный ответ.
- Ровно 4 варианта ответа.
- Неправильные варианты должны быть правдоподобными.
- Вопросы не должны повторяться.
- Объяснение должно соответствовать материалу.

Используй разные типы вопросов:
- определения;
- назначение;
- свойства;
- правила;
- различия;
- последовательность действий;
- важные факты.

Верни ТОЛЬКО JSON:

[
  {
    "question": "Текст вопроса",
    "options": [
      "Вариант 1",
      "Вариант 2",
      "Вариант 3",
      "Вариант 4"
    ],
    "correctIndex": 0,
    "explanation": "Почему ответ правильный"
  }
]

correctIndex может быть только 0, 1, 2 или 3.
`,

      flashcards: `
Ты создаёшь учебные карточки для StudyFish.

Создай 10 карточек по учебному материалу.

Используй:
- термин → определение;
- понятие → объяснение;
- правило → формулировка;
- свойство → описание;
- вопрос → ответ;
- причина → следствие;
- отличие понятий.

Строго:
- Не используй имя преподавателя.
- Не используй дату.
- Не используй номер урока.
- Не используй название файла.
- Не используй служебные данные.
- Не используй обрывки текста.
- Не придумывай информацию.
- Каждая карточка должна иметь точный ответ.
- Карточки не должны повторяться.

Верни ТОЛЬКО JSON:

[
  {
    "question": "Вопрос или термин",
    "answer": "Точный ответ"
  }
]
`,

      chat: `
Ты — AI-помощник StudyFish.

Ответь ученику по предоставленному материалу.

Правила:
- Используй информацию из материала.
- Не придумывай отсутствующие факты.
- Если ответа в материале нет, скажи об этом.
- Объясняй простым русским языком.
`
    };

    const instruction =
      prompts[type] ||
      `
Ты — AI-помощник StudyFish.

Помоги ученику разобраться в учебном материале.

Используй только информацию из материала.
Не придумывай факты.
Отвечай на русском языке.
`;

    const parts = [];

    /*
     * ОБРАБОТКА ФОТО
     */

    if (imageUrl) {
      let parsedUrl;

      try {
        parsedUrl = new URL(imageUrl);
      } catch {
        return res.status(400).json({
          error: "Некорректная ссылка на изображение."
        });
      }

      const allowedOrigin =
        "https://skgujqnfmzaunpdrattg.supabase.co";

      if (parsedUrl.origin !== allowedOrigin) {
        return res.status(400).json({
          error: "Недопустимый источник изображения."
        });
      }

      const imageResponse = await fetch(imageUrl);

      if (!imageResponse.ok) {
        return res.status(400).json({
          error:
            "Не удалось получить изображение учебного материала."
        });
      }

      const contentType =
        imageResponse.headers.get("content-type") ||
        "image/jpeg";

      if (!contentType.startsWith("image/")) {
        return res.status(400).json({
          error:
            "Файл по ссылке не является изображением."
        });
      }

      const imageBuffer = Buffer.from(
        await imageResponse.arrayBuffer()
      );

      if (imageBuffer.length > 10 * 1024 * 1024) {
        return res.status(413).json({
          error:
            "Изображение слишком большое."
        });
      }

      parts.push({
        inline_data: {
          mime_type: contentType.split(";")[0],
          data: imageBuffer.toString("base64")
        }
      });

      parts.push({
        text:
          instruction +
          `

Внимательно прочитай текст на изображении.

Не придумывай отсутствующий текст.

${
  fileName
    ? `Имя файла: ${fileName}`
    : ""
}

${
  type === "chat"
    ? `
Вопрос ученика:

${cleanQuestion}
`
    : ""
}`
      });

    } else {

      /*
       * ОБРАБОТКА ТЕКСТА
       */

      parts.push({
        text:
          instruction +
          `

УЧЕБНЫЙ МАТЕРИАЛ:

${cleanText}

${
  type === "chat"
    ? `
ВОПРОС УЧЕНИКА:

${cleanQuestion}
`
    : ""
}`
      });
    }

    const isStructured =
      type === "quiz" ||
      type === "flashcards";

    const generationConfig = {
      maxOutputTokens:
        type === "summary"
          ? 2400
          : type === "quiz"
            ? 3200
            : type === "flashcards"
              ? 2400
              : type === "chat"
                ? 1400
                : 1800
    };

    if (isStructured) {
      generationConfig.responseMimeType =
        "application/json";
    }

    /*
     * ОСНОВНАЯ МОДЕЛЬ:
     * Gemini 3.5 Flash-Lite
     *
     * ЗАПАСНАЯ:
     * Gemini 2.5 Flash
     */

    const models = [
      "gemini-3.5-flash-lite",
      "gemini-2.5-flash"
    ];

    let data = null;
    let lastError = null;

    for (const model of models) {

      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      try {

        const response = await fetch(url, {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },

          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts
              }
            ],
            generationConfig
          })
        });

        const raw =
          await response.text();

        let parsed = null;

        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = null;
        }

        if (response.ok) {
          data = parsed;
          break;
        }

        lastError = {
          status: response.status,
          data: parsed
        };

        /*
         * При временной перегрузке
         * пробуем запасную модель.
         */

        if (
          response.status === 429 ||
          response.status === 503
        ) {
          continue;
        }

        /*
         * Если модель не найдена,
         * тоже пробуем следующую.
         */

        if (response.status === 404) {
          continue;
        }

        break;

      } catch (error) {

        lastError = {
          status: 500,
          data: {
            error: {
              message:
                error?.message ||
                "Ошибка соединения с Gemini."
            }
          }
        };

        continue;
      }
    }

    /*
     * ОБЕ МОДЕЛИ НЕ ОТВЕТИЛИ
     */

    if (!data) {

      console.error(
        "Gemini API error:",
        JSON.stringify(lastError)
      );

      const status =
        lastError?.status || 500;

      const message =
        lastError?.data?.error?.message ||
        "";

      if (
        status === 429 ||
        status === 503
      ) {
        return res.status(429).json({
          code: "RATE_LIMITED",
          error:
            "Бесплатный Gemini сейчас перегружен или временно достигнут лимит. Попробуй ещё раз через несколько минут."
        });
      }

      return res.status(status).json({
        error:
          message ||
          "Gemini не смог обработать материал."
      });
    }

    /*
     * ПОЛУЧАЕМ ТЕКСТ ОТ GEMINI
     */

    const result =
      data?.candidates?.[0]?.content?.parts
        ?.filter(
          part =>
            typeof part.text === "string"
        )
        ?.map(
          part => part.text
        )
        ?.join("\n")
        ?.trim() || "";

    if (!result) {

      console.error(
        "Gemini returned no text:",
        JSON.stringify(data)
      );

      return res.status(502).json({
        error:
          "Gemini не вернул результат."
      });
    }

    /*
     * ТЕСТ И КАРТОЧКИ
     */

    if (isStructured) {

      let parsedResult = null;

      try {

        parsedResult =
          JSON.parse(result);

      } catch {

        const first =
          result.indexOf("[");

        const last =
          result.lastIndexOf("]");

        if (
          first !== -1 &&
          last > first
        ) {

          try {

            parsedResult =
              JSON.parse(
                result.slice(
                  first,
                  last + 1
                )
              );

          } catch {

            parsedResult = null;
          }
        }
      }

      if (!Array.isArray(parsedResult)) {

        return res.status(502).json({
          error:
            type === "quiz"
              ? "Gemini не смог правильно создать тест. Попробуй ещё раз."
              : "Gemini не смог правильно создать карточки. Попробуй ещё раз."
        });
      }

      /*
       * ПРОВЕРКА ТЕСТА
       */

      if (type === "quiz") {

        const validQuiz =
          parsedResult.filter(item => {

            return (
              item &&
              typeof item.question === "string" &&
              Array.isArray(item.options) &&
              item.options.length === 4 &&
              Number.isInteger(item.correctIndex) &&
              item.correctIndex >= 0 &&
              item.correctIndex <= 3
            );

          });

        if (validQuiz.length < 3) {

          return res.status(502).json({
            error:
              "Gemini создал слишком мало качественных вопросов. Попробуй ещё раз."
          });
        }

        return res.status(200).json({
          result:
            JSON.stringify(
              validQuiz.slice(0, 10)
            )
        });
      }

      /*
       * ПРОВЕРКА КАРТОЧЕК
       */

      if (type === "flashcards") {

        const validCards =
          parsedResult.filter(item => {

            return (
              item &&
              typeof item.question === "string" &&
              item.question.trim() &&
              typeof item.answer === "string" &&
              item.answer.trim()
            );

          });

        if (validCards.length < 3) {

          return res.status(502).json({
            error:
              "Gemini создал слишком мало качественных карточек. Попробуй ещё раз."
          });
        }

        return res.status(200).json({
          result:
            JSON.stringify(
              validCards.slice(0, 10)
            )
        });
      }
    }

    /*
     * КОНСПЕКТ / ДРУГОЙ ТЕКСТОВЫЙ РЕЗУЛЬТАТ
     */

    return res.status(200).json({
      result
    });

  } catch (error) {

    console.error(
      "STUDYFISH GEMINI SERVER ERROR:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Внутренняя ошибка сервера StudyFish."
    });
  }
}
