export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      type,
      text = "",
      imageUrl = null,
      question = "",
      fileName = ""
    } = req.body || {};

    const cleanText = typeof text === "string"
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

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Не настроен бесплатный Gemini API. Добавь GEMINI_API_KEY в Vercel Environment Variables."
      });
    }

    const prompts = {
      summary: `
Ты — AI-помощник для учёбы StudyFish.

Изучи предоставленный учебный материал и сделай хороший школьный конспект.

Если материал содержит заголовок урока, имя преподавателя, дату, номер урока или технические служебные строки, не превращай их в учебные понятия.

Структура:
1. Главные темы
2. Ключевые понятия и определения
3. Важные правила и факты
4. Что нужно запомнить

Используй только информацию из материала.
Не придумывай факты.
Пиши понятно школьнику на русском языке.
`,

      quiz: `
Ты — AI-преподаватель StudyFish.

Создай 10 качественных вопросов для теста ИМЕННО по содержанию учебного материала.

Очень важно:
- Не используй название файла или название урока как вопрос.
- Не используй имя преподавателя, дату, номер урока и служебные данные как учебные понятия.
- Не делай вопросы из обрывков предложений.
- Каждый вопрос должен проверять реальное знание или понимание темы.
- Используй определения, свойства, правила, назначение, различия, причины/следствия и важные факты из материала.
- Каждый вопрос имеет ровно один правильный ответ.
- Ровно 4 варианта ответа.
- Неправильные варианты должны быть правдоподобными и относиться к той же теме.
- Не повторяй один и тот же факт.
- Объяснение должно быть основано на материале.

Верни ТОЛЬКО JSON-массив:

[
  {
    "question": "...",
    "options": ["...", "...", "...", "..."],
    "correctIndex": 0,
    "explanation": "..."
  }
]

correctIndex: 0, 1, 2 или 3.
`,

      flashcards: `
Ты — AI-помощник для учёбы StudyFish.

Создай 10 качественных учебных карточек по содержанию материала.

Приоритет:
1. Термин → определение
2. Понятие → объяснение
3. Правило → формулировка
4. Свойство → описание
5. Вопрос → конкретный факт
6. Причина → следствие
7. Отличие одного понятия от другого

Очень важно:
- Не используй имя преподавателя, дату, номер урока и служебные данные.
- Не используй название файла как учебный вопрос.
- Не вырезай случайные слова из середины предложений.
- Не делай карточку из обрывка текста.
- Каждый вопрос должен иметь понятный точный ответ из материала.
- Карточки не должны повторять друг друга.

Верни ТОЛЬКО JSON-массив:

[
  {
    "question": "...",
    "answer": "..."
  }
]
`,

      chat: `
Ты — StudyFish, AI-помощник для учёбы.

Отвечай на вопрос ученика по предоставленному учебному материалу.
Не придумывай информацию, которой нет в материале.
Если ответа в материале нет, так и скажи.
Объясняй простым русским языком.
`
    };

    const instruction = prompts[type] || `
Ты — AI-помощник StudyFish.
Помоги ученику разобраться в учебном материале.
Используй только информацию из материала.
Пиши на русском языке.
`;

    let parts = [];

    if (imageUrl) {
      let parsedUrl;

      try {
        parsedUrl = new URL(imageUrl);
      } catch {
        return res.status(400).json({
          error: "Некорректная ссылка на изображение."
        });
      }

      if (
        parsedUrl.origin !==
        "https://skgujqnfmzaunpdrattg.supabase.co"
      ) {
        return res.status(400).json({
          error: "Недопустимый источник изображения."
        });
      }

      const imageResponse = await fetch(imageUrl);

      if (!imageResponse.ok) {
        return res.status(400).json({
          error: "Не удалось получить изображение учебного материала."
        });
      }

      const contentType =
        imageResponse.headers.get("content-type") || "image/jpeg";

      if (!contentType.startsWith("image/")) {
        return res.status(400).json({
          error: "Файл по ссылке не является изображением."
        });
      }

      const imageBuffer = Buffer.from(
        await imageResponse.arrayBuffer()
      );

      if (imageBuffer.length > 10 * 1024 * 1024) {
        return res.status(413).json({
          error: "Изображение слишком большое для бесплатного AI."
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
          "\n\nЕсли на изображении есть печатный или рукописный текст, внимательно прочитай его. " +
          "Не придумывай отсутствующий текст." +
          (fileName ? `\nИмя файла: ${fileName}` : "") +
          (type === "chat"
            ? `\n\nВопрос ученика:\n${String(question).trim()}`
            : "")
      });
    } else {
      parts.push({
        text:
          instruction +
          "\n\nУЧЕБНЫЙ МАТЕРИАЛ:\n" +
          cleanText +
          (type === "chat"
            ? `\n\nВОПРОС УЧЕНИКА:\n${String(question).trim()}`
            : "")
      });
    }

    const body = {
      contents: [
        {
          role: "user",
          parts
        }
      ],
      generationConfig: {
        temperature:
          type === "quiz" || type === "flashcards"
            ? 0.2
            : 0.4,

        maxOutputTokens:
          type === "summary"
            ? 2200
            : type === "quiz"
              ? 2600
              : type === "flashcards"
                ? 2200
                : type === "chat"
                  ? 1400
                  : 1800
      }
    };

    if (type === "quiz" || type === "flashcards") {
      body.generationConfig.responseMimeType = "application/json";
    }

    const model = "gemini-3-flash-preview";

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const aiResponse = await fetch(url, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },

      body: JSON.stringify(body)
    });

    const raw = await aiResponse.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      console.error(
        "Gemini non-JSON response:",
        raw
      );

      return res.status(502).json({
        error: "Gemini вернул некорректный ответ."
      });
    }

    if (!aiResponse.ok) {
      console.error(
        "Gemini API error:",
        data
      );

      if (aiResponse.status === 429) {
        return res.status(429).json({
          code: "RATE_LIMITED",
          error:
            "Бесплатный лимит Gemini временно достигнут. Попробуй позже."
        });
      }

      return res.status(aiResponse.status).json({
        error:
          data?.error?.message ||
          "Ошибка Gemini API."
      });
    }

    const result =
      data?.candidates?.[0]?.content?.parts
        ?.filter(
          part => typeof part.text === "string"
        )
        ?.map(
          part => part.text
        )
        ?.join("\n")
        ?.trim() || "";

    if (!result) {
      console.error(
        "Gemini returned no text:",
        data
      );

      return res.status(502).json({
        error:
          "Gemini не вернул текстовый результат."
      });
    }

    if (
      type === "quiz" ||
      type === "flashcards"
    ) {
      let parsed;

      try {
        parsed = JSON.parse(result);
      } catch {
        const first = result.indexOf("[");
        const last = result.lastIndexOf("]");

        if (
          first !== -1 &&
          last > first
        ) {
          try {
            parsed = JSON.parse(
              result.slice(
                first,
                last + 1
              )
            );
          } catch {
            parsed = null;
          }
        }
      }

      if (!Array.isArray(parsed)) {
        return res.status(502).json({
          error:
            type === "quiz"
              ? "Gemini вернул тест в неправильном формате."
              : "Gemini вернул карточки в неправильном формате."
        });
      }

      return res.status(200).json({
        result: JSON.stringify(parsed)
      });
    }

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
        "Внутренняя ошибка сервера."
    });
  }
}
