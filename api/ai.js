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

    if (!cleanText && !imageUrl) {
      return res.status(400).json({
        error: "Учебный материал пустой."
      });
    }

    if (type === "chat" && !String(question).trim()) {
      return res.status(400).json({
        error: "Вопрос пустой."
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is missing");
      return res.status(500).json({
        error: "На сервере не настроен OPENAI_API_KEY."
      });
    }

    /*
     * В StudyFish изображения приходят как временные
     * signed URL из приватного Supabase bucket.
     *
     * Проверяем, что ссылка относится к нашему Supabase,
     * чтобы endpoint не использовался как прокси для чужих URL.
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
- Старайся восстановить слова по контексту, если почерк сложный.
- Не придумывай текст, которого нет на изображении.
- Если часть текста невозможно разобрать, честно укажи это.

Сделай понятный и полезный конспект.

Структура:

1. Главные темы
2. Ключевые понятия
3. Важные факты
4. Что нужно запомнить

Пиши на русском языке.
Используй только информацию из предоставленного материала.
Объясняй понятно школьнику.
`,

      quiz: `
Ты — AI-преподаватель StudyFish.

Изучи предоставленный учебный материал.

Если это изображение, внимательно прочитай весь
видимый текст.

ВАЖНО:
- Распознавай печатный и рукописный текст.
- Если почерк сложный, используй контекст для чтения,
  но не придумывай отсутствующую информацию.

Создай 10 качественных вопросов для интерактивного теста по СОДЕРЖАНИЮ материала.

ВАЖНО: тест должен проверять понимание учебной темы, а не угадывание случайного слова.

- Вопросы должны быть разными: определения, назначение,
  свойства, различия, последовательности действий,
  важные факты.
- Не делай вопросы по одному и тому же предложению
  с заменой одного слова.
- Каждый вопрос должен иметь ровно один
  однозначно правильный ответ.
- Все 4 варианта должны относиться к той же теме
  и выглядеть правдоподобно.
- Неправильные варианты должны быть осмысленными,
  а не случайными словами из текста.
- Не используй информацию, которой нет в материале.
- Не делай правильный вариант заметно длиннее
  или подробнее остальных.
- Объяснение должно кратко объяснять,
  почему правильный ответ верен.

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

Перед выдачей JSON проверь каждый вопрос:

- правильный ответ действительно следует из материала;
- остальные три не являются альтернативно правильными;
- вопрос не повторяет предыдущий;
- варианты относятся к одной теме;
- нет случайных слов.

Верни ТОЛЬКО JSON-массив.

Не добавляй markdown.
Не добавляй текст до или после JSON.

Используй только информацию из учебного материала.
Пиши на русском языке.
`,

      chat: `
Ты — StudyFish, AI-помощник для учёбы.

Отвечай на вопрос ученика, опираясь прежде всего
на предоставленный учебный материал.

Правила:
- Не придумывай факты, которых нет в материале.
- Если на вопрос нельзя надёжно ответить по материалу,
  честно скажи об этом.
- Объясняй простым и понятным русским языком.
- Если ученик не понял тему, объясни её проще.
- При необходимости приведи короткий понятный пример,
  связанный с материалом.
- Не используй сложные формулировки без объяснения.
- Не используй markdown-таблицы.
- Можно использовать короткие списки и абзацы.

Верни только ответ для ученика,
без служебных комментариев.
`,

      flashcards: `
Ты — AI-помощник для учёбы StudyFish.

Изучи предоставленный учебный материал.

Если это изображение, внимательно прочитай весь
видимый текст.

ВАЖНО:
- Распознавай печатный и рукописный текст.
- Не придумывай информацию, которой нет в материале.

Создай 10 качественных учебных карточек
для запоминания материала.

ВАЖНО: карточки должны быть логически связаны
с темой и помогать учить материал.

Сначала выдели:

1. Самые важные термины.
2. Определения.
3. Правила.
4. Свойства.
5. Важные факты.
6. Причины и следствия.
7. Различия между понятиями.
8. Последовательности действий.

Делай вопросы конкретными:

«Что такое...»
«Для чего используется...»
«Какие свойства имеет...»
«Чем отличается...»
«Как выполняется...»

Используй эти формы только тогда,
когда они подтверждаются материалом.

ВАЖНО:

- Не делай карточки из случайных длинных слов.
- Не делай карточки из случайных предложений.
- Не повторяй один и тот же факт.
- Не задавай вопрос, если на него нельзя
  точно ответить по материалу.
- Ответ должен быть коротким и точным.
- Вопрос должен быть понятен школьнику.
- Каждая карточка должна проверять отдельную
  важную часть материала.

Верни ТОЛЬКО JSON-массив такого вида:

[
  {
    "question": "Вопрос",
    "answer": "Короткий точный ответ"
  }
]

Не добавляй markdown.
Не добавляй текст до или после JSON.

Используй только информацию из материала.
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
Используй только информацию из материала.
`;

    let input;

    if (imageUrl) {
      input = [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                type === "chat"
                  ? instruction +
                    "\n\nФАЙЛ: " +
                    (fileName || "учебный материал") +
                    "\n\nВОПРОС УЧЕНИКА:\n" +
                    String(question).trim()
                  : instruction
            },
            {
              type: "input_image",
              image_url: imageUrl
            }
          ]
        }
      ];
    } else {
      input =
        type === "chat"
          ? instruction +
            "\n\nУЧЕБНЫЙ МАТЕРИАЛ:\n" +
            cleanText +
            "\n\nВОПРОС УЧЕНИКА:\n" +
            String(question).trim()
          : instruction +
            "\n\nУЧЕБНЫЙ МАТЕРИАЛ:\n" +
            cleanText;
    }

    const outputTokens =
      type === "summary"
        ? 2200
        : type === "quiz"
        ? 2600
        : type === "flashcards"
        ? 2200
        : type === "chat"
        ? 1400
        : 1800;

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization":
            `Bearer ${process.env.OPENAI_API_KEY}`
        },

        body: JSON.stringify({
          model: "gpt-5.6-luna",
          input,
          max_output_tokens: outputTokens
        })
      }
    );

    const rawText =
      await openaiResponse.text();

    let data;

    try {
      data = JSON.parse(rawText);
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

    if (!openaiResponse.ok) {
      console.error(
        "OpenAI API error:",
        data
      );

      if (openaiResponse.status === 429) {
        return res.status(429).json({
          code: "RATE_LIMITED",
          error:
            "AI временно достиг лимита запросов. Попробуй снова позже. Фото теперь сначала распознаются бесплатно, поэтому такие запросы будут заметно легче."
        });
      }

      return res.status(
        openaiResponse.status
      ).json({
        error:
          data?.error?.message ||
          "Ошибка OpenAI."
      });
    }

    let result = "";

    if (
      typeof data.output_text === "string"
    ) {
      result = data.output_text;
    }

    if (
      !result &&
      Array.isArray(data.output)
    ) {
      for (
        const item of data.output
      ) {
        if (
          !Array.isArray(item.content)
        ) {
          continue;
        }

        for (
          const content of item.content
        ) {
          if (
            content.type === "output_text" &&
            typeof content.text === "string"
          ) {
            result += content.text;
          }
        }
      }
    }

    result = result.trim();

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
     * Для теста и карточек сервер сам проверяет,
     * что AI действительно вернул JSON.
     */

    if (
      type === "quiz" ||
      type === "flashcards"
    ) {
      let clean = result
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .trim();

      let parsed = null;

      try {
        parsed = JSON.parse(clean);
      } catch (error) {
        const first =
          clean.indexOf("[");

        const last =
          clean.lastIndexOf("]");

        if (
          first !== -1 &&
          last > first
        ) {
          try {
            parsed = JSON.parse(
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

      if (
        parsed &&
        !Array.isArray(parsed) &&
        (
          (
            type === "quiz" &&
            Array.isArray(
              parsed.questions
            )
          ) ||
          (
            type === "flashcards" &&
            Array.isArray(
              parsed.cards
            )
          )
        )
      ) {
        parsed =
          type === "quiz"
            ? parsed.questions
            : parsed.cards;
      }

      if (!Array.isArray(parsed)) {
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

      result =
        JSON.stringify(parsed);
    }

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
