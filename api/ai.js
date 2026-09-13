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
      imageUrl = null
    } = req.body || {};

    const cleanText =
      typeof text === "string"
        ? text.trim()
        : "";

    if (!cleanText && !imageUrl) {
      return res.status(400).json({
        error: "Учебный материал пустой."
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is missing");

      return res.status(500).json({
        error: "На сервере не настроен OPENAI_API_KEY."
      });
    }

    /*
     * Проверяем ссылку на изображение.
     * Разрешаем только наш Supabase Storage.
     */
    if (imageUrl) {
      let parsedUrl;

      try {
        parsedUrl = new URL(imageUrl);
      } catch (error) {
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
    }

    const prompts = {

      summary: `
Ты — AI-помощник для учёбы StudyFish.

Изучи предоставленный учебный материал.

Если это изображение, внимательно прочитай весь
видимый текст на изображении.

ВАЖНО:
- Распознавай как печатный, так и рукописный текст.
- Старайся восстановить слова по контексту,
  если почерк сложный.
- Не придумывай текст, которого нет на изображении.
- Если часть текста невозможно разобрать,
  честно укажи это.

Сделай понятный и полезный конспект.

Структура:

1. Главные темы
2. Ключевые понятия
3. Важные факты
4. Что нужно запомнить

Пиши на русском языке.

Используй только информацию
из предоставленного материала.

Объясняй понятно школьнику.
`,

      quiz: `
Ты — AI-преподаватель StudyFish.

Изучи предоставленный учебный материал.

Если это изображение, внимательно прочитай весь
видимый текст.

ВАЖНО:
- Распознавай печатный и рукописный текст.
- Если почерк сложный, используй контекст
  для чтения.
- Не придумывай информацию,
  которой нет в материале.

Создай 10 вопросов
для интерактивного теста.

Для каждого вопроса используй строго такой формат:

{
  "question": "Текст вопроса",
  "options": [
    "Вариант 1",
    "Вариант 2",
    "Вариант 3",
    "Вариант 4"
  ],
  "correctIndex": 0,
  "explanation": "Короткое объяснение"
}

Правила correctIndex:

0 — первый вариант
1 — второй вариант
2 — третий вариант
3 — четвёртый вариант

Верни ТОЛЬКО JSON-массив.

Не добавляй markdown.

Не добавляй текст до или после JSON.

Используй только информацию
из учебного материала.

Пиши на русском языке.
`,

      flashcards: `
Ты — AI-помощник для учёбы StudyFish.

Изучи предоставленный учебный материал.

Если это изображение, внимательно прочитай весь
видимый текст.

ВАЖНО:
- Распознавай печатный и рукописный текст.
- Не придумывай информацию,
  которой нет в материале.

Создай 10 учебных карточек.

Верни ТОЛЬКО JSON-массив такого вида:

[
  {
    "question": "Вопрос",
    "answer": "Ответ"
  }
]

Не добавляй markdown.

Не добавляй текст до или после JSON.

Используй только информацию
из материала.

Пиши на русском языке.
`
    };

    const instruction =
      prompts[type] ||
      `
Ты — AI-помощник StudyFish.

Помоги ученику разобраться
в предоставленном учебном материале.

Пиши на русском языке.

Используй только информацию
из материала.
`;

    let input;

    /*
     * Если есть изображение,
     * передаём его в OpenAI как input_image.
     */
    if (imageUrl) {

      input = [
        {
          role: "user",

          content: [

            {
              type: "input_text",
              text: instruction
            },

            {
              type: "input_image",
              image_url: imageUrl
            }

          ]
        }
      ];

    } else {

      /*
       * PDF / DOCX / TXT.
       */
      input =
        instruction +
        "\n\nУЧЕБНЫЙ МАТЕРИАЛ:\n" +
        cleanText;
    }

    /*
     * Запрос к OpenAI Responses API.
     */
    const openaiResponse =
      await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${process.env.OPENAI_API_KEY}`
          },

          body: JSON.stringify({

            model:
              "gpt-5.6-luna",

            input,

            max_output_tokens:
              4000

          })
        }
      );

    /*
     * Читаем ответ как текст,
     * чтобы сервер не падал,
     * если OpenAI вернул ошибку.
     */
    const rawText =
      await openaiResponse.text();

    let data;

    try {

      data =
        JSON.parse(rawText);

    } catch (error) {

      console.error(
        "OpenAI non-JSON response:",
        rawText
      );

      return res.status(502).json({
        error:
          "OpenAI вернул некорректный ответ."
      });
    }

    /*
     * Ошибка OpenAI.
     */
    if (!openaiResponse.ok) {

      console.error(
        "OpenAI API error:",
        data
      );

      return res.status(
        openaiResponse.status
      ).json({

        error:
          data?.error?.message ||
          "Ошибка OpenAI."

      });
    }

    /*
     * Получаем текст ответа.
     */
    let result = "";

    if (
      typeof data.output_text ===
      "string"
    ) {

      result =
        data.output_text;

    }

    /*
     * Запасной способ извлечения текста.
     */
    if (
      !result &&
      Array.isArray(data.output)
    ) {

      for (
        const item of data.output
      ) {

        if (
          !Array.isArray(
            item.content
          )
        ) {

          continue;
        }

        for (
          const content of
          item.content
        ) {

          if (
            content.type ===
              "output_text" &&
            typeof content.text ===
              "string"
          ) {

            result +=
              content.text;

          }

        }

      }

    }

    result =
      result.trim();

    if (!result) {

      console.error(
        "OpenAI returned no text:",
        data
      );

      return res.status(502).json({
        error:
          "AI не вернул текстовый результат."
      });
    }

    /*
     * Проверяем JSON для теста
     * и карточек.
     */
    if (
      type === "quiz" ||
      type === "flashcards"
    ) {

      let clean =
        result
          .replace(
            /^```json\s*/i,
            ""
          )
          .replace(
            /^```\s*/i,
            ""
          )
          .replace(
            /\s*```$/i,
            ""
          )
          .trim();

      let parsed = null;

      /*
       * Сначала пробуем распарсить
       * весь ответ.
       */
      try {

        parsed =
          JSON.parse(clean);

      } catch (error) {

        /*
         * Если AI случайно добавил текст,
         * ищем JSON-массив внутри ответа.
         */
        const first =
          clean.indexOf("[");

        const last =
          clean.lastIndexOf("]");

        if (
          first !== -1 &&
          last > first
        ) {

          try {

            parsed =
              JSON.parse(
                clean.slice(
                  first,
                  last + 1
                )
              );

          } catch (secondError) {

            parsed = null;

          }

        }

      }

      /*
       * Поддерживаем также:
       *
       * {
       *   "questions": [...]
       * }
       *
       * и
       *
       * {
       *   "cards": [...]
       * }
       */
      if (
        parsed &&
        !Array.isArray(parsed)
      ) {

        if (
          type === "quiz" &&
          Array.isArray(
            parsed.questions
          )
        ) {

          parsed =
            parsed.questions;

        }

        if (
          type === "flashcards" &&
          Array.isArray(
            parsed.cards
          )
        ) {

          parsed =
            parsed.cards;

        }

      }

      /*
       * Если JSON всё ещё неправильный,
       * сообщаем понятную ошибку.
       */
      if (
        !Array.isArray(parsed)
      ) {

        console.error(
          "Invalid structured AI result:",
          result
        );

        return res.status(502).json({

          error:
            type === "quiz"
              ? "AI вернул тест в неправильном формате."
              : "AI вернул карточки в неправильном формате."

        });

      }

      /*
       * Отдаём фронтенду нормальный JSON.
       */
      result =
        JSON.stringify(parsed);
    }

    /*
     * Успешный ответ.
     */
    return res.status(200).json({
      result
    });

  } catch (error) {

    console.error(
      "STUDYFISH SERVER ERROR:",
      error
    );

    return res.status(500).json({

      error:
        error?.message ||
        "Внутренняя ошибка сервера."

    });
  }
}
