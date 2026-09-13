export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      text = "",
      imageUrl = null,
      fileName = "Учебный материал"
    } = req.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "На сервере не настроен OPENAI_API_KEY."
      });
    }

    const cleanText =
      typeof text === "string" ? text.trim() : "";

    if (!cleanText && !imageUrl) {
      return res.status(400).json({
        error: "Учебный материал пустой."
      });
    }

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
    }

    const scriptPrompt = `
Ты — сценарист учебных подкастов StudyFish.

Создай короткий, живой и понятный аудиоподкаст по учебному материалу.
Название файла: ${fileName}

Правила:
- Пиши только на русском языке.
- Используй только информацию из предоставленного материала.
- Не добавляй факты из общих знаний.
- Не читай материал дословно.
- Объясняй основные идеи простыми словами.
- Начни с короткого приветствия и названия темы.
- Затем последовательно объясни 3–6 самых важных идей.
- Добавь несколько конкретных примеров только если они есть в материале.
- В конце сделай короткое повторение того, что нужно запомнить.
- Не используй Markdown, списки с символами, эмодзи и специальные обозначения.
- Текст должен звучать естественно при озвучке.
- Длина сценария: примерно 1800–3200 символов.

Верни только готовый текст сценария без комментариев.
`;

    const input = imageUrl
      ? [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: scriptPrompt
              },
              {
                type: "input_image",
                image_url: imageUrl
              }
            ]
          }
        ]
      : `${scriptPrompt}

УЧЕБНЫЙ МАТЕРИАЛ:

${cleanText.slice(0, 120000)}`;

    const scriptResponse = await fetch(
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
          max_output_tokens: 2200
        })
      }
    );

    const scriptData = await scriptResponse.json();

    if (!scriptResponse.ok) {
      console.error(
        "OpenAI script error:",
        scriptData
      );

      return res.status(scriptResponse.status).json({
        error:
          scriptData?.error?.message ||
          "Не удалось создать сценарий подкаста."
      });
    }

    let script = "";

    if (typeof scriptData.output_text === "string") {
      script = scriptData.output_text;
    }

    if (!script && Array.isArray(scriptData.output)) {
      for (const item of scriptData.output) {
        if (!Array.isArray(item.content)) continue;

        for (const content of item.content) {
          if (
            content.type === "output_text" &&
            typeof content.text === "string"
          ) {
            script += content.text;
          }
        }
      }
    }

    script = script
      .replace(/^```[a-z]*\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    if (!script) {
      return res.status(500).json({
        error: "AI не вернул сценарий подкаста."
      });
    }

    const ttsResponse = await fetch(
      "https://api.openai.com/v1/audio/speech",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          voice: "alloy",
          input: script,
          instructions:
            "Говори по-русски естественно, спокойно и дружелюбно, как хороший преподаватель. Делай короткие паузы между смысловыми частями. Не читай слишком быстро.",
          response_format: "mp3"
        })
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();

      console.error(
        "OpenAI TTS error:",
        errorText
      );

      let message =
        "Не удалось озвучить подкаст.";

      try {
        const parsed = JSON.parse(errorText);

        message =
          parsed?.error?.message ||
          message;
      } catch {}

      return res.status(ttsResponse.status).json({
        error: message
      });
    }

    const audioBuffer = Buffer.from(
      await ttsResponse.arrayBuffer()
    );

    /*
     * The frontend uses this header only to show
     * the generated script in the player modal.
     */
    const encodedScript = Buffer.from(
      script,
      "utf8"
    ).toString("base64");

    res.setHeader(
      "Content-Type",
      "audio/mpeg"
    );

    res.setHeader(
      "Content-Length",
      audioBuffer.length.toString()
    );

    res.setHeader(
      "Content-Disposition",
      'inline; filename="studyfish-podcast.mp3"'
    );

    res.setHeader(
      "X-StudyFish-Script",
      encodedScript
    );

    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    return res
      .status(200)
      .send(audioBuffer);

  } catch (error) {
    console.error(
      "Podcast server error:",
      error
    );

    return res.status(500).json({
      error:
        "Ошибка сервера при создании подкаста."
    });
  }
}
