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
          "На сервере не настроен GEMINI_API_KEY. Добавь его в Vercel → Settings → Environment Variables."
      });
    }

    const prompts = {
      summary: `
Ты — AI-помощник для учёбы StudyFish.

Изучи предоставленный учебный материал и сделай понятный школьный конспект.

Очень важно:
- Используй только информацию из предоставленного материала.
- Не придумывай факты.
- Не используй имя преподавателя как учебное понятие.
- Не используй название файла как учебное понятие.
- Не превращай дату, номер урока, класс, автора и другие служебные данные в учебные пункты.
- Если в тексте есть обрывки или технические строки, игнорируй их.

Структура ответа:

# Главная тема

Кратко объясни, о чём материал.

# Основные понятия

Дай важные термины и понятные определения.

# Главное

Выдели самые важные правила, свойства, факты и идеи.

# Что нужно запомнить

Сделай короткий список того, что ученик должен знать после изучения темы.

Пиши на русском языке.
Пиши понятно ученику.
`,

      quiz: `
Ты создаёшь школьный тест для StudyFish.

Создай 10 качественных вопросов ИМЕННО по предоставленному учебному материалу.

СТРОГО СОБЛЮДАЙ:

1. Каждый вопрос должен проверять реальное знание материала.
2. Не используй имя преподавателя.
3. Не используй дату.
4. Не используй номер урока.
5. Не используй название файла как вопрос.
6. Не используй служебные данные документа.
7. Не используй обрывки предложений.
8. Не придумывай информацию, которой нет в материале.
9. Каждый вопрос должен иметь ровно один правильный ответ.
10. У каждого вопроса ровно 4 варианта.
11. Неправильные варианты должны быть правдоподобными.
12. Не повторяй один и тот же вопрос.
13. Объяснение правильного ответа должно соответствовать материалу.

Используй разные типы вопросов:
- определения;
- назначение;
- свойства;
- правила;
- различия;
- последовательность действий;
- важные факты.

Верни ТОЛЬКО JSON.

Формат:

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
    "explanation": "Почему этот ответ правильный"
  }
]

correctIndex может быть только:
0, 1, 2 или 3.
`,

      flashcards: `
Ты создаёшь учебные карточки для StudyFish.

Создай 10 качественных карточек по предоставленному учебному материалу.

Карточки должны помогать учить материал.

Используй:
- термин → определение;
- понятие → объяснение;
- правило → формулировка;
- свойство → описание;
- вопрос → конкретный ответ;
- причина → следствие;
- отличие одного понятия от другого.

СТРОГО:

- Не используй имя преподавателя.
- Не используй дату.
- Не используй номер урока.
- Не используй название файла.
- Не используй служебную информацию.
- Не используй случайные обрывки текста.
- Не придумывай информацию.
- Каждая карточка должна иметь понятный вопрос и точный ответ.
- Карточки не должны повторяться.

Верни ТОЛЬКО JSON.

Формат:

[
  {
    "question": "Вопрос или термин",
    "answer": "Точный ответ"
  }
]
`,

      chat: `
Ты — AI-помощник StudyFish.

Ответь ученику на вопрос, используя предоставленный учебный материал.

Правила:
- Используй прежде всего информацию из материала.
- Не придумывай отсутствующие факты.
- Если ответа в материале нет, честно скажи об этом.
- Объясняй простым русским языком.
- Не используй лишнюю информацию.
`
    };

    const instruction =
      prompts[type] ||
      `
Ты — AI-помощник StudyFish.

Помоги ученику разобраться в предоставленном учебном материале.

Используй только информацию из материала.
Не придумывай факты.
Отвечай на русском языке.
`;

    const contentsParts = [];

    /*
     * Если пришла фотография,
     * получаем её с Supabase и передаём Gemini.
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

      contentsParts.push({
        inline_data: {
          mime_type: contentType.split(";")[0],
          data: imageBuffer.toString("base64")
        }
      });

      contentsParts.push({
        text:
          instruction +
          `

Внимательно прочитай текст на изображении.

Не придумывай отсутствующий текст.
Не превращай имя файла, имя преподавателя или дату в учебные понятия.

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
       * Обычный текстовый материал.
       */
      contentsParts.push({
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

    /*
     * Для тестов и карточек нужен JSON.
     */
    const isStructured =
      type === "quiz" ||
      type === "flashcards";

    const generationConfig = {
      temperature: isStructured ? 0.15 : 0.35,

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
     * Сначала используем лёгкую бесплатную модель.
     *
     * Если она временно перегружена,
     * пробуем обычную Gemini 2.5 Flash.
     */
    const models = [
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash"
    ];

    let lastError = null;
    let data = null;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];

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
                parts: contentsParts
              }
            ],

            generationConfig
          })
        });

        const raw = await response.text();

        let parsed;

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
         * Если Gemini перегружен или временно ограничил запрос,
         * пробуем следующую бесплатную модель.
         */
        if (
          response.status === 429 ||
          response.status === 503
        ) {
          continue;
        }

        /*
         * Другие ошибки нет смысла повторять
         * другой моделью.
         */
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
     * Если обе модели не ответили.
     */
    if (!data) {
      const status =
        lastError?.status || 500;

      const message =
        lastError?.data?.error?.message ||
        "";

      console.error(
        "Gemini API error:",
        JSON.stringify(lastError)
      );

      if (
        status === 429 ||
        status === 503
      ) {
        return res.status(429).json({
          code: "RATE_LIMITED",

          error:
            "Бесплатный Gemini сейчас перегружен или достигнут временный лимит. Попробуй ещё раз через несколько минут."
        });
      }

      return res.status(status).json({
        error:
          message ||
          "Не удалось получить ответ Gemini."
      });
    }

    /*
     * Получаем текст из ответа Gemini.
     */
    const result =
      data?.candidates?.[0]?.content?.parts
        ?.filter(
          part =>
            typeof part.text === "string"
        )
        ?.map(part => part.text)
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
     * Проверяем JSON для теста и карточек.
     */
    if (isStructured) {
      let parsedResult = null;

      try {
        parsedResult =
          JSON.parse(result);
      } catch {
        /*
         * Иногда модель добавляет лишний текст.
         * Пытаемся достать только JSON-массив.
         */
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
       * Дополнительная проверка теста.
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
       * Дополнительная проверка карточек.
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
     * Обычный текстовый результат:
     * конспект или ответ.
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
