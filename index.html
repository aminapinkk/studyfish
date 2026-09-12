export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { type, text } = req.body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "Учебный материал пустой."
      });
    }

    const prompts = {
      summary: `
Ты — AI-помощник для учебы StudyFish.

Сделай понятный и полезный конспект предоставленного учебного материала.

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

Создай 10 вопросов для проверки знаний по предоставленному учебному материалу.

Для каждого вопроса:
- вопрос
- 4 варианта ответа
- правильный ответ
- короткое объяснение

Используй только информацию из материала.
Пиши на русском языке.
`,

      flashcards: `
Ты — AI-помощник StudyFish.

Создай 10 учебных карточек по предоставленному материалу.

Формат:

Карточка 1
Вопрос: ...
Ответ: ...

Карточка 2
Вопрос: ...
Ответ: ...

Используй только информацию из материала.
Пиши на русском языке.
`
    };

    const instruction =
      prompts[type] ||
      `
Ты — AI-помощник StudyFish.
Помоги ученику разобраться в предоставленном учебном материале.
Пиши на русском языке.
Используй только информацию из материала.
`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-5.6-luna",
          input: `${instruction}

УЧЕБНЫЙ МАТЕРИАЛ:

${text}`,
          max_output_tokens: 4000
        })
      }
    );

    const data = await response.json();

    console.log("OpenAI response:", JSON.stringify(data));

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Ошибка при обращении к OpenAI."
      });
    }

    let result = "";

    // Основной вариант Responses API
    if (typeof data.output_text === "string") {
      result = data.output_text;
    }

    // Запасной вариант: достаём текст из output
    if (!result && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (!Array.isArray(item.content)) continue;

        for (const content of item.content) {
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
        JSON.stringify(data)
      );

      return res.status(500).json({
        error: "AI не вернул текстовый результат."
      });
    }

    return res.status(200).json({
      result
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: "Ошибка сервера: " + error.message
    });
  }
}
