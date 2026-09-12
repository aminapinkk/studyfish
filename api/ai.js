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
        error: "Text is required"
      });
    }

    const prompts = {
      summary: `
Ты — AI-помощник для учебы StudyFish.
Сделай понятный конспект предоставленного учебного материала.
Выдели:
1. Главные темы
2. Ключевые понятия
3. Важные факты
4. Что нужно запомнить

Пиши на русском языке, структурированно и понятно школьнику.
`,

      quiz: `
Ты — AI-преподаватель StudyFish.
Создай 10 вопросов для проверки знаний по предоставленному учебному материалу.
Для каждого вопроса дай 4 варианта ответа и укажи правильный ответ.
Вопросы должны проверять именно материал пользователя.
`,

      flashcards: `
Ты — AI-помощник StudyFish.
Создай набор из 10 учебных карточек по предоставленному материалу.
Формат каждой карточки:
Вопрос: ...
Ответ: ...

Используй только информацию из материала.
`
    };

    const instruction =
      prompts[type] ||
      "Помоги ученику разобраться в предоставленном учебном материале.";

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
          input: `${instruction}\n\nУЧЕБНЫЙ МАТЕРИАЛ:\n${text}`,
          max_output_tokens: 4000
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);

      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI request failed"
      });
    }

    return res.status(200).json({
      result: data.output_text || ""
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: "Server error"
    });
  }
}
