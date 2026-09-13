export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { type, text, imageData } = req.body || {};

    if (!text?.trim() && !imageData) {
      return res.status(400).json({
        error: "Учебный материал пустой."
      });
    }

    const prompts = {
      summary: `
Ты — AI-помощник для учебы StudyFish.

Изучи предоставленный учебный материал или изображение.

Сделай понятный и полезный конспект.

Структура:
1. Главные темы
2. Ключевые понятия
3. Важные факты
4. Что нужно запомнить

Если материал представлен на изображении, внимательно прочитай весь видимый текст.

Пиши на русском языке.
Используй только информацию из предоставленного материала.
Объясняй понятно школьнику.
`,

      quiz: `
Ты — AI-преподаватель StudyFish.

Изучи предоставленный учебный материал или изображение.

Создай 10 вопросов для проверки знаний.

Для каждого вопроса:
- вопрос
- 4 варианта ответа
- правильный ответ
- короткое объяснение

Если материал представлен на изображении, сначала внимательно прочитай его.

Используй только информацию из материала.
Пиши на русском языке.
`,

      flashcards: `
Ты — AI-помощник StudyFish.

Изучи предоставленный учебный материал или изображение.

Создай 10 учебных карточек.

Верни результат ТОЛЬКО в формате JSON-массива:

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

Не добавляй никаких пояснений до или после JSON.

Если материал представлен на изображении, внимательно прочитай его.

Используй только информацию из материала.
Пиши на русском языке.
`
    };

    const instruction =
      prompts[type] ||
      "Помоги ученику разобраться в предоставленном учебном материале.";

    let input;

    if (imageData) {
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
              image_url: imageData
            }
          ]
        }
      ];
    } else {
      input = `${instruction}\n\nУЧЕБНЫЙ МАТЕРИАЛ:\n${text}`;
    }

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
          input,
          max_output_tokens: 4000
        })
      }
    );

    const data = await response.json();

    console.log("OpenAI response:", JSON.stringify(data));

    if (!response.ok) {
      console.error("OpenAI error:", data);

      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI request failed"
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
        error: "AI не вернул текстовый результат."
      });
    }

    if (type === "flashcards") {
      let cards = null;

      try {
        let clean = result
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

        try {
          cards = JSON.parse(clean);
        } catch {
          const start = clean.indexOf("[");
          const end = clean.lastIndexOf("]");

          if (start !== -1 && end !== -1 && end > start) {
            cards = JSON.parse(
              clean.slice(start, end + 1)
            );
          }
        }

        if (cards && !Array.isArray(cards) && Array.isArray(cards.cards)) {
          cards = cards.cards;
        }

        if (!Array.isArray(cards)) {
          throw new Error("Invalid flashcards format");
        }

        cards = cards
          .filter(card => card && card.question && card.answer)
          .map(card => ({
            question: String(card.question),
            answer: String(card.answer)
          }));

        return res.status(200).json({
          result: JSON.stringify(cards)
        });

      } catch (error) {
        console.error("Flashcards parse error:", error);

        return res.status(500).json({
          error: "Не удалось создать учебные карточки."
        });
      }
    }

    return res.status(200).json({
      result
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: "Server error"
    });
  }
}
