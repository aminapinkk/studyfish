<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>StudyFish — AI-помощник для учёбы</title>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js"></script>

  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: Arial, sans-serif;
      background: #f4f8ff;
      color: #172554;
    }

    nav {
      height: 72px;
      background: white;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 7%;
    }

    .logo {
      font-size: 25px;
      font-weight: 800;
      color: #2563eb;
    }

    .logo span {
      color: #f59e0b;
    }

    .nav-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-email {
      font-size: 14px;
      color: #64748b;
    }

    button {
      border: none;
      cursor: pointer;
      font-weight: 700;
      border-radius: 12px;
      padding: 11px 18px;
      font-size: 14px;
    }

    .login-btn {
      background: #2563eb;
      color: white;
    }

    .logout-btn {
      background: #eff6ff;
      color: #2563eb;
    }

    .hero {
      text-align: center;
      padding: 80px 20px 45px;
    }

    .fish {
      font-size: 72px;
      margin-bottom: 18px;
    }

    .hero h1 {
      font-size: 52px;
      margin-bottom: 18px;
      color: #172554;
    }

    .hero h1 span {
      color: #2563eb;
    }

    .hero p {
      max-width: 650px;
      margin: auto;
      font-size: 18px;
      line-height: 1.6;
      color: #64748b;
    }

    .upload-box {
      max-width: 760px;
      margin: 35px auto;
      background: white;
      border: 2px dashed #93c5fd;
      border-radius: 22px;
      padding: 38px;
      text-align: center;
      box-shadow: 0 12px 30px rgba(37, 99, 235, 0.08);
    }

    .upload-box h2 {
      margin-bottom: 10px;
    }

    .upload-box p {
      color: #64748b;
      margin-bottom: 22px;
    }

    .upload-btn {
      background: #2563eb;
      color: white;
      padding: 14px 26px;
      font-size: 16px;
    }

    .upload-btn:hover,
    .login-btn:hover {
      background: #1d4ed8;
    }

    input[type="file"] {
      display: none;
    }

    .status {
      margin-top: 18px;
      font-size: 14px;
      color: #64748b;
    }

    .materials {
      max-width: 900px;
      margin: 45px auto 80px;
      padding: 0 20px;
    }

    .materials h2 {
      margin-bottom: 18px;
    }

    .material {
      background: white;
      border-radius: 15px;
      padding: 18px 20px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #e5e7eb;
    }

    .material-name {
      font-weight: 700;
    }

    .material-type {
      color: #64748b;
      font-size: 13px;
      margin-top: 5px;
    }

    .delete-btn {
      background: #fee2e2;
      color: #dc2626;
    }

    .empty {
      color: #64748b;
      background: white;
      padding: 25px;
      border-radius: 15px;
    }

    .features {
      max-width: 1050px;
      margin: 0 auto 80px;
      padding: 0 20px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px;
    }

    .feature {
      background: white;
      padding: 25px;
      border-radius: 18px;
      border: 1px solid #e5e7eb;
    }

    .feature-icon {
      font-size: 32px;
      margin-bottom: 15px;
    }

    .feature h3 {
      margin-bottom: 8px;
    }

    .feature p {
      color: #64748b;
      line-height: 1.5;
      font-size: 14px;
    }

    .modal {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal.active {
      display: flex;
    }

    .modal-box {
      background: white;
      width: 100%;
      max-width: 420px;
      padding: 30px;
      border-radius: 20px;
      position: relative;
    }

    .close {
      position: absolute;
      right: 18px;
      top: 15px;
      background: none;
      font-size: 24px;
      color: #64748b;
    }

    .modal-box h2 {
      margin-bottom: 8px;
    }

    .modal-subtitle {
      color: #64748b;
      font-size: 14px;
      margin-bottom: 22px;
    }

    .form-input {
      width: 100%;
      padding: 13px;
      margin-bottom: 12px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 15px;
    }

    .auth-submit {
      width: 100%;
      background: #2563eb;
      color: white;
      margin-top: 5px;
    }

    .switch-auth {
      text-align: center;
      margin-top: 18px;
      color: #64748b;
      font-size: 14px;
    }

    .switch-auth button {
      padding: 0;
      background: none;
      color: #2563eb;
    }

    @media (max-width: 800px) {
      .features {
        grid-template-columns: repeat(2, 1fr);
      }

      .hero h1 {
        font-size: 40px;
      }

      .user-email {
        display: none;
      }
    }

    @media (max-width: 500px) {
      .features {
        grid-template-columns: 1fr;
      }

      nav {
        padding: 0 20px;
      }

      .material {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
    }

    .material-actions {
      display: flex;
      gap: 7px;
      flex-wrap: wrap;
      margin-top: 12px;
    }

    .ai-btn {
      background: #eff6ff;
      color: #2563eb;
      padding: 8px 11px;
      font-size: 12px;
      border: 1px solid #bfdbfe;
    }

    .ai-btn:hover {
      background: #dbeafe;
    }

    .material {
      align-items: flex-start;
    }

    .material-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }

    .ai-modal {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      z-index: 20;
    }

    .ai-modal.active {
      display: flex;
    }

    .ai-modal-box {
      background: white;
      width: 100%;
      max-width: 820px;
      max-height: 85vh;
      overflow-y: auto;
      padding: 30px;
      border-radius: 20px;
      position: relative;
    }

    .ai-modal-box h2 {
      margin-bottom: 12px;
      color: #172554;
    }

    .ai-result {
      white-space: pre-wrap;
      line-height: 1.7;
      color: #334155;
      background: #f8fafc;
      padding: 20px;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
    }

    .ai-loading {
      color: #2563eb;
      font-weight: 700;
      padding: 20px 0;
    }


    .flashcards-app {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .flashcard-progress {
      color: #64748b;
      font-size: 14px;
      font-weight: 700;
      text-align: center;
    }

    .flashcard {
      min-height: 300px;
      perspective: 1000px;
      cursor: pointer;
    }

    .flashcard-inner {
      position: relative;
      width: 100%;
      min-height: 300px;
      transition: transform 0.55s ease;
      transform-style: preserve-3d;
    }

    .flashcard.flipped .flashcard-inner {
      transform: rotateY(180deg);
    }

    .flashcard-face {
      position: absolute;
      inset: 0;
      min-height: 300px;
      backface-visibility: hidden;
      border: 1px solid #dbeafe;
      border-radius: 20px;
      background: #f8fafc;
      padding: 34px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .flashcard-face.answer {
      transform: rotateY(180deg);
      background: #eff6ff;
    }

    .flashcard-label {
      color: #2563eb;
      font-size: 13px;
      font-weight: 800;
      margin-bottom: 18px;
      text-transform: uppercase;
      letter-spacing: .06em;
    }

    .flashcard-text {
      color: #172554;
      font-size: 22px;
      line-height: 1.5;
      font-weight: 700;
    }

    .flashcard-hint {
      margin-top: 18px;
      color: #94a3b8;
      font-size: 13px;
    }

    .flashcard-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
    }

    .flashcard-controls button {
      background: #2563eb;
      color: white;
      padding: 10px 18px;
      border-radius: 10px;
      font-weight: 700;
    }

    .flashcard-controls button:disabled {
      opacity: .45;
      cursor: not-allowed;
    }

    @media (max-width: 700px) {
      .material-right {
        width: 100%;
        align-items: flex-start;
      }
    }
  </style>
</head>

<body>

  <nav>
    <div class="logo">
      Study<span>Fish</span> 🐟
    </div>

    <div class="nav-right">
      <span class="user-email" id="userEmail"></span>
      <button class="login-btn" id="authButton">
        Войти
      </button>
      <button class="logout-btn" id="logoutButton" style="display:none;">
        Выйти
      </button>
    </div>
  </nav>

  <section class="hero">

    <div class="fish">🐟</div>

    <h1>
      Учись эффективнее с <span>StudyFish</span>
    </h1>

    <p>
      Загружай учебные материалы и превращай их в
      конспекты, тесты, карточки и подкасты с помощью ИИ.
    </p>

    <div class="upload-box">

      <h2>Загрузи учебный материал</h2>

      <p>
        PDF, DOC, DOCX or TXT
      </p>

      <label for="fileInput">
        <button class="upload-btn" type="button"
          onclick="document.getElementById('fileInput').click()">
          📁 Выбрать файл
        </button>
      </label>

      <input
        id="fileInput"
        type="file"
        accept=".pdf,.doc,.docx,.txt"
      >

      <div class="status" id="uploadStatus">
        Войти to upload your materials.
      </div>

    </div>

  </section>


  <section class="features">

    <div class="feature">
      <div class="feature-icon">📝</div>
      <h3>Конспект</h3>
      <p>
        Превращай большие учебные материалы в понятные конспекты.
      </p>
    </div>

    <div class="feature">
      <div class="feature-icon">🧠</div>
      <h3>Тест</h3>
      <p>
        Проверяй знания с помощью вопросов, созданных ИИ.
      </p>
    </div>

    <div class="feature">
      <div class="feature-icon">🃏</div>
      <h3>Карточки</h3>
      <p>
        Создавай умные карточки для быстрого запоминания.
      </p>
    </div>

    <div class="feature">
      <div class="feature-icon">🎧</div>
      <h3>Подкаст</h3>
      <p>
        Слушай учебный материал в формате AI-подкаста.
      </p>
    </div>

  </section>


  <section class="materials">

    <h2>Мои материалы</h2>

    <div id="materialsList">
      <div class="empty">
        Войти to see your materials.
      </div>
    </div>

  </section>


  <!-- AUTH MODAL -->

  <div class="modal" id="authModal">

    <div class="modal-box">

      <button class="close" id="closeModal">
        ×
      </button>

      <h2 id="authTitle">
        Войти
      </h2>

      <p class="modal-subtitle" id="authSubtitle">
        С возвращением в StudyFish.
      </p>

      <input
        class="form-input"
        id="emailInput"
        type="email"
        placeholder="Email"
      >

      <input
        class="form-input"
        id="passwordInput"
        type="password"
        placeholder="Пароль"
      >

      <button class="auth-submit" id="authSubmit">
        Войти
      </button>

      <div class="switch-auth">
        <span id="switchText">
          Нет аккаунта?
        </span>

        <button id="switchAuth">
          Регистрация
        </button>
      </div>

      <div class="status" id="authStatus"></div>

    </div>

  </div>


  <!-- AI RESULT MODAL -->
  <div class="ai-modal" id="aiModal">
    <div class="ai-modal-box">
      <button class="close" id="closeAiModal">×</button>
      <h2 id="aiTitle">Результат</h2>
      <div id="aiContent" class="ai-result">Подожди...</div>
    </div>
  </div>

<script>

  /* ==============================
     SUPABASE
  ============================== */

  const SUPABASE_URL =
    "https://skgujqnfmzaunpdrattg.supabase.co";

  /*
    IMPORTANT:
    Replace the text below with your Supabase
    publishable key — the same key you already
    used in your previous version of index.html.
  */

  const SUPABASE_KEY =
    "sb_publishable_nBSqoQDivThmH5ZXG9ze3A_8v00QXqZ";

  const supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );


  /* ==============================
     ELEMENTS
  ============================== */

  const authButton =
    document.getElementById("authButton");

  const logoutButton =
    document.getElementById("logoutButton");

  const authModal =
    document.getElementById("authModal");

  const closeModal =
    document.getElementById("closeModal");

  const authTitle =
    document.getElementById("authTitle");

  const authSubtitle =
    document.getElementById("authSubtitle");

  const authSubmit =
    document.getElementById("authSubmit");

  const switchAuth =
    document.getElementById("switchAuth");

  const switchText =
    document.getElementById("switchText");

  const emailInput =
    document.getElementById("emailInput");

  const passwordInput =
    document.getElementById("passwordInput");

  const authStatus =
    document.getElementById("authStatus");

  const userEmail =
    document.getElementById("userEmail");

  const fileInput =
    document.getElementById("fileInput");

  const uploadStatus =
    document.getElementById("uploadStatus");

  const materialsList =
    document.getElementById("materialsList");

  const aiModal = document.getElementById("aiModal");
  const closeAiModal = document.getElementById("closeAiModal");
  const aiTitle = document.getElementById("aiTitle");
  const aiContent = document.getElementById("aiContent");

  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  closeAiModal.addEventListener("click", () => {
    aiModal.classList.remove("active");
  });

  aiModal.addEventListener("click", (event) => {
    if (event.target === aiModal) {
      aiModal.classList.remove("active");
    }
  });



  let isSignUp = false;


  /* ==============================
     AUTH MODAL
  ============================== */

  authButton.addEventListener("click", () => {
    authModal.classList.add("active");
  });


  closeModal.addEventListener("click", () => {
    authModal.classList.remove("active");
    authStatus.textContent = "";
  });


  switchAuth.addEventListener("click", () => {

    isSignUp = !isSignUp;

    if (isSignUp) {

      authTitle.textContent = "Создать аккаунт";

      authSubtitle.textContent =
        "Создай аккаунт StudyFish.";

      authSubmit.textContent =
        "Регистрация";

      switchText.textContent =
        "Уже есть аккаунт?";

      switchAuth.textContent =
        "Войти";

    } else {

      authTitle.textContent = "Войти";

      authSubtitle.textContent =
        "С возвращением в StudyFish.";

      authSubmit.textContent =
        "Войти";

      switchText.textContent =
        "Нет аккаунта?";

      switchAuth.textContent =
        "Регистрация";
    }

    authStatus.textContent = "";
  });


  /* ==============================
     SIGN UP / SIGN IN
  ============================== */

  authSubmit.addEventListener("click", async () => {

    const email =
      emailInput.value.trim();

    const password =
      passwordInput.value;

    if (!email || !password) {

      authStatus.textContent =
        "Введи email и пароль.";

      return;
    }

    authStatus.textContent =
      "Подожди...";

    if (isSignUp) {

      const { data, error } =
        await supabaseClient.auth.signUp({
          email,
          password
        });

      if (error) {

        authStatus.textContent =
          error.message;

        return;
      }

      if (!data.session) {

        authStatus.textContent =
          "Аккаунт создан! Проверь почту, чтобы подтвердить аккаунт.";

        return;
      }

    } else {

      const { error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) {

        authStatus.textContent =
          error.message;

        return;
      }
    }

    authModal.classList.remove("active");

    emailInput.value = "";
    passwordInput.value = "";
    authStatus.textContent = "";

  });


  /* ==============================
     LOG OUT
  ============================== */

  logoutButton.addEventListener("click", async () => {

    await supabaseClient.auth.signOut();

  });


  /* ==============================
     UPDATE UI
  ============================== */

  async function updateAuthUI() {

    const {
      data: {
        user
      }
    } = await supabaseClient.auth.getUser();

    if (user) {

      authButton.style.display = "none";

      logoutButton.style.display = "block";

      userEmail.textContent =
        user.email;

      uploadStatus.textContent =
        "Выбери файл для загрузки.";

      loadMaterials();

    } else {

      authButton.style.display =
        "block";

      logoutButton.style.display =
        "none";

      userEmail.textContent = "";

      uploadStatus.textContent =
        "Войти to upload your materials.";

      materialsList.innerHTML =
        '<div class="empty">Войти to see your materials.</div>';
    }
  }


  /* ==============================
     AUTH STATE
  ============================== */

  supabaseClient.auth.onAuthStateChange(
    async () => {

      await updateAuthUI();

    }
  );


  /* ==============================
     UPLOAD FILE
  ============================== */

  fileInput.addEventListener(
    "change",
    async (event) => {

      const file =
        event.target.files[0];

      if (!file) return;


      const {
        data: {
          user
        }
      } = await supabaseClient.auth.getUser();


      if (!user) {

        uploadStatus.textContent =
          "Сначала войди в аккаунт.";

        authModal.classList.add("active");

        return;
      }


      uploadStatus.textContent =
        "Загрузка " + file.name + "...";


      const safeName =
        file.name
          .replace(/[^a-zA-Z0-9._-]/g, "_");


      const filePath =
        user.id +
        "/" +
        Date.now() +
        "-" +
        safeName;


      const {
        error: uploadError
      } =
        await supabaseClient.storage
          .from("documents")
          .upload(
            filePath,
            file,
            {
              cacheControl: "3600",
              upsert: false
            }
          );


      if (uploadError) {

        console.error(uploadError);

        uploadStatus.textContent =
          "Ошибка загрузки: " +
          uploadError.message;

        return;
      }


      const {
        error: dbError
      } =
        await supabaseClient
          .from("documents")
          .insert({

            user_id: user.id,

            file_name:
              file.name,

            storage_path:
              filePath,

            file_type:
              file.type || "unknown"

          });


      if (dbError) {

        console.error(dbError);

        uploadStatus.textContent =
          "Файл загружен, но запись в базе данных не создана.";

        return;
      }


      uploadStatus.textContent =
        "✅ " + file.name + " успешно загружен!";


      fileInput.value = "";

      loadMaterials();

    }
  );


  /* ==============================
     LOAD MATERIALS
  ============================== */

  async function loadMaterials() {

    const {
      data: {
        user
      }
    } = await supabaseClient.auth.getUser();


    if (!user) return;


    const {
      data,
      error
    } =
      await supabaseClient
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {

      console.error(error);

      materialsList.innerHTML =
        '<div class="empty">Не удалось загрузить материалы.</div>';

      return;
    }


    if (!data || data.length === 0) {

      materialsList.innerHTML =
        '<div class="empty">У тебя пока нет загруженных материалов.</div>';

      return;
    }


    materialsList.innerHTML = "";


    data.forEach((doc) => {
      const item = window.document.createElement("div");
      item.className = "material";

      const info = window.document.createElement("div");

      const name = window.document.createElement("div");
      name.className = "material-name";
      name.textContent = "📄 " + doc.file_name;

      const type = window.document.createElement("div");
      type.className = "material-type";
      type.textContent = doc.file_type || "Документ";

      const actions = window.document.createElement("div");
      actions.className = "material-actions";

      const summaryButton = window.document.createElement("button");
      summaryButton.className = "ai-btn";
      summaryButton.textContent = "📝 Конспект";
      summaryButton.addEventListener("click", () =>
        generateAI(doc, "summary")
      );

      const quizButton = window.document.createElement("button");
      quizButton.className = "ai-btn";
      quizButton.textContent = "🧠 Тест";
      quizButton.addEventListener("click", () =>
        generateAI(doc, "quiz")
      );

      const flashcardsButton = window.document.createElement("button");
      flashcardsButton.className = "ai-btn";
      flashcardsButton.textContent = "🃏 Карточки";
      flashcardsButton.addEventListener("click", () =>
        generateAI(doc, "flashcards")
      );

      actions.appendChild(summaryButton);
      actions.appendChild(quizButton);
      actions.appendChild(flashcardsButton);

      info.appendChild(name);
      info.appendChild(type);
      info.appendChild(actions);

      const right = window.document.createElement("div");
      right.className = "material-right";

      const deleteButton = window.document.createElement("button");
      deleteButton.className = "delete-btn";
      deleteButton.textContent = "Удалить";
      deleteButton.addEventListener("click", () => deleteMaterial(doc));

      right.appendChild(deleteButton);
      item.appendChild(info);
      item.appendChild(right);
      materialsList.appendChild(item);
    });

  }



  /* ==============================
     AI STUDY TOOLS
  ============================== */

  async function downloadMaterial(doc) {
    const { data, error } = await supabaseClient.storage
      .from("documents")
      .download(doc.storage_path);

    if (error) {
      throw new Error("Не удалось скачать материал: " + error.message);
    }

    return data;
  }

  async function extractTextFromFile(file, fileName) {
    const lower = fileName.toLowerCase();

    if (lower.endsWith(".txt")) {
      return await file.text();
    }

    if (lower.endsWith(".docx")) {
      if (!window.mammoth) {
        throw new Error("Не загрузился модуль для чтения DOCX.");
      }

      const arrayBuffer = await file.arrayBuffer();
      const result = await window.mammoth.extractRawText({
        arrayBuffer
      });

      return result.value;
    }

    if (lower.endsWith(".pdf")) {
      if (!window.pdfjsLib) {
        throw new Error("Не загрузился модуль для чтения PDF.");
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({
        data: arrayBuffer
      }).promise;

      let text = "";

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();

        text += content.items
          .map(item => item.str)
          .join(" ") + "\n\n";
      }

      return text;
    }

    if (lower.endsWith(".doc")) {
      throw new Error(
        "Формат DOC пока не поддерживается для AI. Сохрани файл как DOCX или PDF."
      );
    }

    throw new Error("Этот формат файла пока не поддерживается.");
  }

  function parseFlashcards(raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {}

    const cleaned = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (_) {}

    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (_) {}
    }

    return null;
  }

  function renderFlashcards(raw) {
    const cards = parseFlashcards(raw);

    if (!Array.isArray(cards) || cards.length === 0) {
      aiContent.className = "ai-result";
      aiContent.textContent =
        "Не удалось превратить ответ AI в интерактивные карточки.";
      return;
    }

    let index = 0;

    aiContent.className = "flashcards-app";

    function draw() {
      const card = cards[index] || {};
      const question = card.question || card.front || "Вопрос";
      const answer = card.answer || card.back || "Ответ";

      aiContent.innerHTML = `
        <div class="flashcard-progress">
          Карточка ${index + 1} из ${cards.length}
        </div>

        <div class="flashcard" id="activeFlashcard" tabindex="0" aria-label="Нажми, чтобы перевернуть карточку">
          <div class="flashcard-inner">
            <div class="flashcard-face">
              <div class="flashcard-label">Вопрос</div>
              <div class="flashcard-text"></div>
              <div class="flashcard-hint">Нажми на карточку, чтобы увидеть ответ</div>
            </div>

            <div class="flashcard-face answer">
              <div class="flashcard-label">Ответ</div>
              <div class="flashcard-text"></div>
              <div class="flashcard-hint">Нажми ещё раз, чтобы перевернуть</div>
            </div>
          </div>
        </div>

        <div class="flashcard-controls">
          <button type="button" id="prevCard">← Назад</button>
          <button type="button" id="nextCard">Дальше →</button>
        </div>
      `;

      const active = document.getElementById("activeFlashcard");
      const faces = active.querySelectorAll(".flashcard-text");
      faces[0].textContent = question;
      faces[1].textContent = answer;

      active.addEventListener("click", () => {
        active.classList.toggle("flipped");
      });

      active.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          active.classList.toggle("flipped");
        }
      });

      const prev = document.getElementById("prevCard");
      const next = document.getElementById("nextCard");

      prev.disabled = index === 0;
      next.disabled = index === cards.length - 1;

      prev.addEventListener("click", () => {
        if (index > 0) {
          index--;
          draw();
        }
      });

      next.addEventListener("click", () => {
        if (index < cards.length - 1) {
          index++;
          draw();
        }
      });
    }

    draw();
  }


  async function generateAI(doc, type) {
    const titles = {
      summary: "📝 Конспект",
      quiz: "🧠 Тест",
      flashcards: "🃏 Карточки"
    };

    aiTitle.textContent = titles[type] || "🤖 StudyFish AI";
    aiContent.className = "ai-loading";
    aiContent.textContent = "🐟 StudyFish читает материал и готовит ответ...";
    aiModal.classList.add("active");

    try {
      const file = await downloadMaterial(doc);
      let text = await extractTextFromFile(file, doc.file_name);

      text = text.trim();

      if (!text) {
        throw new Error("Не удалось найти текст в этом файле.");
      }

      // Ограничиваем размер запроса, чтобы большие документы обрабатывались стабильнее.
      const maxChars = 120000;
      if (text.length > maxChars) {
        text = text.slice(0, maxChars);
      }

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type,
          text
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не удалось получить ответ от AI.");
      }

      if (type === "flashcards" && data.result) {
        renderFlashcards(data.result);
      } else {
        aiContent.className = "ai-result";
        aiContent.textContent = data.result || "AI не вернул результат.";
      }

      // Сохраняем результат в Supabase.
      const {
        data: { user }
      } = await supabaseClient.auth.getUser();

      if (user && data.result) {
        await supabaseClient.from("study_results").insert({
          user_id: user.id,
          document_id: doc.id,
          result_type: type,
          content: data.result
        });
      }

    } catch (error) {
      console.error(error);
      aiContent.className = "ai-result";
      aiContent.textContent =
        "Не удалось обработать материал.\n\n" + error.message;
    }
  }

  /* ==============================
     DELETE MATERIAL
  ============================== */

  async function deleteMaterial(doc) {

    const confirmed =
      confirm(
        "Удалить " +
        doc.file_name +
        "?"
      );


    if (!confirmed) return;


    const {
      error: storageError
    } =
      await supabaseClient
        .storage
        .from("documents")
        .remove([
          doc.storage_path
        ]);


    if (storageError) {

      alert(
        "Не удалось удалить файл: " +
        storageError.message
      );

      return;
    }


    const {
      error: dbError
    } =
      await supabaseClient
        .from("documents")
        .delete()
        .eq("id", doc.id);


    if (dbError) {

      alert(
        "Файл удалён, но запись в базе данных не удалось удалить."
      );

      return;
    }


    loadMaterials();

  }


  /* ==============================
     START
  ============================== */

  updateAuthUI();

</script>

</body>
</html>
