export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    const {
      type,
      text,
      imageData
    } = req.body || {};

    if (!text?.trim() && !imageData) {
      return res.status(400).json({
        error: "Учебный материал пустой."
      });
    }

    const prompts = {

      summary: `
Ты — AI-помощник для учёбы StudyFish.

Изучи предоставленный учебный материал или изображение.

Сделай понятный и полезный конспект.

Структура:

1. Главные темы
2. Ключевые понятия
3. Важные факты
4. Что нужно запомнить

Если материал находится на фотографии,
внимательно прочитай весь видимый текст.

Пиши на русском языке.

Используй только информацию
из предоставленного материала.

Объясняй понятно школьнику.
`,

      quiz: `
Ты — AI-преподаватель StudyFish.

Изучи предоставленный учебный материал или изображение.

Создай 10 вопросов для интерактивного теста.

Для каждого вопроса используй:

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

correctIndex:

0 = первый вариант
1 = второй вариант
2 = третий вариант
3 = четвёртый вариант

Верни ТОЛЬКО JSON-массив.

Не добавляй ```json.
Не добавляй текст до или после JSON.

Используй только информацию
из учебного материала.

Пиши на русском языке.
`,

      flashcards: `
Ты — AI-помощник для учёбы StudyFish.

Изучи предоставленный учебный материал
или изображение.

Создай 10 учебных карточек.

Верни ТОЛЬКО JSON:

[
  {
    "question": "Вопрос",
    "answer": "Ответ"
  }
]

Не добавляй ```json.

Не добавляй текст до или после JSON.

Используй только информацию
из материала.

Пиши на русском языке.
`
    };


    const instruction =
      prompts[type] ||
      "Помоги ученику разобраться в учебном материале.";


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

      input =
        instruction +
        "\n\nУЧЕБНЫЙ МАТЕРИАЛ:\n" +
        text;
    }


    const response =
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


    const rawText =
      await response.text();


    let data;

    try {

      data =
        JSON.parse(rawText);

    } catch (error) {

      console.error(
        "OpenAI returned non-JSON:",
        rawText
      );

      return res.status(500).json({
        error:
          "OpenAI вернул некорректный ответ."
      });
    }


    console.log(
      "OpenAI response:",
      JSON.stringify(data)
    );


    if (!response.ok) {

      console.error(
        "OpenAI error:",
        data
      );

      return res.status(
        response.status
      ).json({
        error:
          data?.error?.message ||
          "Ошибка OpenAI."
      });
    }


    let result = "";


    if (
      typeof data.output_text ===
      "string"
    ) {

      result =
        data.output_text;
    }


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

      return res.status(500).json({
        error:
          "AI не вернул результат."
      });
    }


    /*
      Проверяем JSON для теста
      и карточек.
    */

    if (
      type === "quiz" ||
      type === "flashcards"
    ) {

      let clean =
        result
          .replace(
            /```json/gi,
            ""
          )
          .replace(
            /```/g,
            ""
          )
          .trim();


      let parsed = null;


      try {

        parsed =
          JSON.parse(clean);

      } catch (error) {

        const start =
          clean.indexOf("[");

        const end =
          clean.lastIndexOf("]");


        if (
          start !== -1 &&
          end !== -1 &&
          end > start
        ) {

          try {

            parsed =
              JSON.parse(
                clean.slice(
                  start,
                  end + 1
                )
              );

          } catch (e) {}
        }
      }


      if (!parsed) {

        return res.status(500).json({
          error:
            "AI вернул данные в неправильном формате."
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
      "Server error:",
      error
    );


    return res.status(500).json({
      error:
        error?.message ||
        "Server error"
    });
  }
}
