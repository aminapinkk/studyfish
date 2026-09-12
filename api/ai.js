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

Сделай понятный конспект предоставленного учебного материала.

Выдели:
1. Главные темы
2. Ключевые понятия
3. Важные факты
4. Что нужно запомнить

Пиши на русском языке.
Используй только информацию из материала.
`,

      quiz: `
Ты — AI-преподаватель StudyFish.

Создай 10 вопросов для проверки знаний по предоставленному учебному материалу.

Для каждого вопроса дай:
- вопрос
- 4 варианта ответа
- правильный ответ

Используй только информацию из материала.
Пиши на русском языке.
`,

      flashcards: `
Ты — AI-помощник StudyFish.

Создай ровно 10 интерактивных учебных карточек
по предоставленному материалу.

Верни результат ТОЛЬКО как корректный JSON-массив.

Формат:

[
  {
    "question": "Вопрос",
    "answer": "Ответ"
  },
  {
    "question": "Вопрос",
    "answer": "Ответ"
  }
]

Требования:
- ровно 10 карточек;
- question — короткий вопрос;
- answer — понятный краткий ответ;
- используй только информацию из учебного материала;
- не добавляй Markdown;
- не добавляй пояснения до или после JSON;
- пиши на русском языке.
`
    };

    const instruction =
      prompts[type] ||
      "Помоги ученику разобраться в учебном материале.";

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

    if (!response.ok) {
      console.error("OpenAI error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Ошибка при обращении к OpenAI."
      });
    }

    let result = "";

    if (typeof data.output_text === "string") {
      result = data.output_text;
    }

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
      return res.status(500).json({
        error: "AI не вернул результат."
      });
    }

    // Для интерактивных карточек превращаем ответ AI в настоящий JSON
    if (type === "flashcards") {
      try {
        // Убираем возможные ```json ... ```
        result = result
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        const cards = JSON.parse(result);

        if (!Array.isArray(cards)) {
          throw new Error("Cards are not an array");
        }

        const cleanCards = cards
          .filter(
            card =>
              card &&
              typeof card.question === "string" &&
              typeof card.answer === "string"
          )
          .slice(0, 10);

        if (cleanCards.length === 0) {
          throw new Error("No valid cards");
        }

        return res.status(200).json({
          result: JSON.stringify(cleanCards)
        });

      } catch (error) {
        console.error("Flashcards JSON error:", error);
        console.error("AI result:", result);

        return res.status(500).json({
          error: "AI создал карточки в неправильном формате."
        });
      }
    }

    // Конспект и тест работают как раньше
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
