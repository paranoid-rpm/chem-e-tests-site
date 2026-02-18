import { buildQuestions } from "./questionBank.js";

const STORE_KEY = "chem_quiz_progress_v1";
const SETTINGS_KEY = "chem_quiz_settings_v2";
const FAV_KEY = "chem_quiz_favs_v1";
const SESSION_KEY = "chem_quiz_session_v1";

function loadProgress(){
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); }
  catch { return {}; }
}
function saveProgress(obj){
  localStorage.setItem(STORE_KEY, JSON.stringify(obj));
}

function loadSettings(){
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{\"trainer\":true,\"exam\":false}");
  } catch {
    return { trainer: true, exam: false };
  }
}
function saveSettings(obj){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj));
}

function loadFavs(){
  try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveFavs(set){
  try { localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(set))); } catch {}
}

function loadSession(){
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}
function saveSession(obj){
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(obj)); } catch {}
}
function clearSession(){
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

function shuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function el(tag, attrs={}, html=""){
  const x = document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k === "class") x.className = v;
    else x.setAttribute(k, v);
  }
  x.innerHTML = html;
  return x;
}

function fmt(sec){
  const m = Math.floor(sec/60);
  const s = sec%60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function anyLightboxOpen(){
  const lb = document.querySelector(".lightbox");
  return !!(lb && !lb.classList.contains("hidden"));
}

function normTitle(s){
  return String(s || "").trim();
}

function extractVariantNumber(title){
  const m = String(title || "").match(/вариант\s*(\d+)/i);
  if(!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

function chemTopicNameByTemplate(t){
  const map = {
    chemAtom: "Атом и таблица",
    chemReactions: "Реакции и уравнивание",
    chemSolutions: "Растворы и смеси",
    chemAcidBase: "Кислоты, основания, соли"
  };
  if(t && map[t]) return map[t];
  return "Другое";
}

function defaultKey(t){
  const cat = t.category || "";
  const topic = (cat === "Химия") ? chemTopicNameByTemplate(t.template) : "";
  const v = extractVariantNumber(t.title);
  return `${cat}::${topic}::${String(v ?? 999).padStart(3,"0")}::${normTitle(t.title)}`;
}

export async function initQuiz(){
  const listNode = document.querySelector("#quizList");
  const boxNode  = document.querySelector("#quizBox");
  if(!listNode || !boxNode) return;

  const data = await fetch("./assets/data/tests.json").then(r => r.json());
  const progress = loadProgress();
  const settings = loadSettings();

  const search = document.querySelector("#testSearch");
  const catSel = document.querySelector("#testCategory");
  const sortSel = document.querySelector("#testSort");
  const trainerMode = document.querySelector("#trainerMode");
  const examMode = document.querySelector("#examMode");
  const favOnly = document.querySelector("#favOnly");
  const progressInfo = document.querySelector("#progressInfo");
  const shownInfo = document.querySelector("#shownInfo");

  const expandAllBtn = document.querySelector("#expandAll");
  const collapseAllBtn = document.querySelector("#collapseAll");

  const favs = loadFavs();

  if(trainerMode){
    trainerMode.checked = !!settings.trainer;
    trainerMode.addEventListener("change", () => {
      settings.trainer = trainerMode.checked;
      if(settings.trainer) settings.exam = false;
      saveSettings(settings);
      if(examMode) examMode.checked = !!settings.exam;
    });
  }

  if(examMode){
    examMode.checked = !!settings.exam;
    examMode.addEventListener("change", () => {
      settings.exam = examMode.checked;
      if(settings.exam) settings.trainer = false;
      saveSettings(settings);
      if(trainerMode) trainerMode.checked = !!settings.trainer;
    });
  }

  // категории
  const categories = Array.from(new Set(data.tests.map(t => t.category))).sort((a,b)=>a.localeCompare(b));
  if(catSel){
    catSel.innerHTML = "";
    catSel.appendChild(el("option", {value:""}, "Все"));
    categories.forEach(c => catSel.appendChild(el("option", {value:c}, c)));
  }

  // прогресс
  if(progressInfo){
    const done = Object.values(progress).filter(x => x?.done).length;
    const total = data.tests.length;
    let avg = 0;
    const pcts = Object.values(progress).filter(x => x?.done && typeof x.pct === "number").map(x => x.pct);
    if(pcts.length) avg = Math.round(pcts.reduce((a,b)=>a+b,0)/pcts.length);
    progressInfo.textContent = `Пройдено: ${done}/${total}. Средний результат: ${pcts.length ? avg+"%" : "—"}.`;
  }

  function matches(t){
    const q = (search?.value || "").trim().toLowerCase();
    const cat = catSel?.value || "";
    if(cat && t.category !== cat) return false;
    if(favOnly?.checked && !favs.has(t.id)) return false;
    if(!q) return true;
    const hay = `${t.title} ${t.description} ${t.category}`.toLowerCase();
    return hay.includes(q);
  }

  function sortTests(arr){
    const mode = sortSel?.value || "default";

    const byTitle = (a,b) => normTitle(a.title).localeCompare(normTitle(b.title), "ru");

    if(mode === "title"){
      return [...arr].sort(byTitle);
    }

    if(mode === "fav"){
      return [...arr].sort((a,b) => {
        const af = favs.has(a.id) ? 0 : 1;
        const bf = favs.has(b.id) ? 0 : 1;
        if(af !== bf) return af - bf;
        return defaultKey(a).localeCompare(defaultKey(b), "ru");
      });
    }

    if(mode === "progress"){
      return [...arr].sort((a,b) => {
        const ad = progress[a.id]?.done ? 1 : 0;
        const bd = progress[b.id]?.done ? 1 : 0;
        if(ad !== bd) return ad - bd; // новые (0) сначала
        return defaultKey(a).localeCompare(defaultKey(b), "ru");
      });
    }

    // default
    return [...arr].sort((a,b) => defaultKey(a).localeCompare(defaultKey(b), "ru"));
  }

  function buildItemHTML(t, session){
    const done = progress[t.id]?.done;
    const pct = progress[t.id]?.pct;
    const qCount = t.questions?.length || t.questionIds?.length || t.questionCount || 10;
    const isFav = favs.has(t.id);
    const canContinue = session && session.testId === t.id && typeof session.i === "number";

    const timerChip = t.timerSec ? `<span class="tag">таймер</span>` : ``;
    const pctChip = (done && typeof pct === "number") ? `<span class="tag">${pct}%</span>` : ``;

    return `
      <div class="test-item" data-test="${t.id}">
        <div class="test-head">
          <div>
            <div class="test-title">
              <b>${t.title}</b>
              <span class="tag">${t.category}</span>
              <span class="tag">${qCount} вопросов</span>
              ${timerChip}
              ${pctChip}
            </div>
            <div class="small test-desc">${t.description}</div>
            <div class="test-actions">
              <button class="btn btn-ghost" data-action="fav" type="button" aria-label="В избранное">${isFav ? "★" : "☆"}</button>
              ${canContinue ? `<button class="btn" data-action="continue" type="button">Продолжить</button>` : ``}
              <button class="btn" data-action="start" type="button">Начать</button>
              <button class="btn btn-ghost" data-action="export" type="button">Экспорт</button>
            </div>
          </div>
          <span class="tag test-state">${done ? "пройден" : "новый"}</span>
        </div>
      </div>
    `;
  }

  function renderList(){
    listNode.innerHTML = "";

    const raw = data.tests.filter(matches);
    const tests = sortTests(raw);

    if(shownInfo){
      shownInfo.textContent = `Показано: ${tests.length}/${data.tests.length}`;
    }

    if(!tests.length){
      listNode.appendChild(el("div", {class:"small"}, "Ничего не найдено. Измени запрос или фильтр."));
      return;
    }

    const session = loadSession();

    // Группировка: категория → (в Химии) тема
    const catMap = new Map();

    tests.forEach(t => {
      const cat = t.category || "Без категории";
      if(!catMap.has(cat)) catMap.set(cat, new Map());

      const sub = (cat === "Химия") ? chemTopicNameByTemplate(t.template) : "Варианты";
      const subMap = catMap.get(cat);
      if(!subMap.has(sub)) subMap.set(sub, []);
      subMap.get(sub).push(t);
    });

    // Рендер
    Array.from(catMap.entries()).forEach(([cat, subMap]) => {
      const catCount = Array.from(subMap.values()).reduce((a,b)=>a+b.length, 0);

      const catDetails = el("details", {class:"group", open:""});
      const catSummary = el("summary", {}, `
        <div>
          <div class="group-title"><b>${cat}</b><span class="tag">${catCount}</span></div>
          <div class="small group-hint">Нажми, чтобы свернуть/развернуть</div>
        </div>
        <span class="tag">раздел</span>
      `);
      catDetails.appendChild(catSummary);

      const body = el("div", {class:"group-body"});

      Array.from(subMap.entries()).forEach(([sub, arr]) => {
        const open = (cat !== "Химия") ? true : (sub !== "Другое");
        const subDetails = el("details", {class:"subgroup", ...(open ? {open:""} : {})});
        const subSummary = el("summary", {}, `<div class="group-title"><b>${sub}</b><span class="tag">${arr.length}</span></div><span class="tag">тема</span>`);
        subDetails.appendChild(subSummary);

        const subBody = el("div", {class:"subgroup-body"});
        subBody.innerHTML = arr.map(t => buildItemHTML(t, session)).join("");

        subDetails.appendChild(subBody);
        body.appendChild(subDetails);
      });

      catDetails.appendChild(body);
      listNode.appendChild(catDetails);
    });
  }

  // Делегирование кликов по списку
  listNode.addEventListener("click", (e) => {
    const actEl = e.target && e.target.closest ? e.target.closest("[data-action]") : null;
    if(!actEl) return;

    const item = actEl.closest("[data-test]");
    const testId = item && item.getAttribute("data-test");
    if(!testId) return;

    const t = data.tests.find(x => x.id === testId);
    if(!t) return;

    const act = actEl.getAttribute("data-action");

    e.preventDefault();
    e.stopPropagation();

    if(act === "fav"){
      if(favs.has(t.id)) favs.delete(t.id); else favs.add(t.id);
      saveFavs(favs);
      renderList();
      return;
    }

    if(act === "export"){
      const p = loadProgress()[t.id];
      const payload = { testId: t.id, title: t.title, progress: p || null };
      navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).catch(()=>{});
      actEl.textContent = "Скопировано";
      setTimeout(() => (actEl.textContent = "Экспорт"), 900);
      return;
    }

    if(act === "continue"){
      const s = loadSession();
      if(s && s.testId === t.id) runTest(data, t.id, loadSettings(), s);
      return;
    }

    if(act === "start"){
      clearSession();
      runTest(data, t.id, loadSettings(), null);
    }
  });

  function setAllDetails(open){
    const nodes = Array.from(listNode.querySelectorAll("details.group, details.subgroup"));
    nodes.forEach(d => {
      if(open) d.setAttribute("open", "");
      else d.removeAttribute("open");
    });
  }

  expandAllBtn?.addEventListener("click", () => setAllDetails(true));
  collapseAllBtn?.addEventListener("click", () => setAllDetails(false));

  search?.addEventListener("input", renderList);
  catSel?.addEventListener("change", renderList);
  sortSel?.addEventListener("change", renderList);
  favOnly?.addEventListener("change", renderList);

  boxNode.innerHTML = `
    <div class="card-pad">
      <h2>Выбери тест</h2>
      <p>Тренировка показывает подсказки и пояснения (если они есть). Экзамен — без подсказок и без «Назад».</p>
      <p class="small">Результаты и прогресс сохраняются на этом устройстве (в браузере).</p>
    </div>
  `;

  renderList();
}

async function runTest(data, testId, settings, session){
  const test = data.tests.find(t => t.id === testId);
  const boxNode  = document.querySelector("#quizBox");

  let questions = [];
  let state = { chosen: {}, hintOpen: {} };
  let i = 0;
  let startTs = Date.now();
  let left = test.timerSec || null;

  const exam = !!settings?.exam;
  const trainer = !!settings?.trainer && !exam;

  function stopAndBack(){
    window.location.href = "./tests.html";
  }

  // Resume
  if(session && session.testId === testId && Array.isArray(session.questions)){
    questions = session.questions;
    state = session.state || state;
    i = session.i || 0;
    startTs = session.startTs || startTs;
    if(typeof session.left === "number") left = session.left;
  } else {
    if(Array.isArray(test.questions) && test.questions.length){
      questions = [...test.questions];
    } else if(Array.isArray(test.questionIds) && test.questionIds.length && data.questionBank){
      questions = test.questionIds
        .map((qid, idx) => ({...data.questionBank[qid], id: `q${idx+1}`}))
        .filter(Boolean);
    } else if(test.template){
      questions = buildQuestions(test);
    }

    // Экзамен всегда перемешивает
    if(test.randomize || exam) questions = shuffle(questions);
    questions = questions.map(q => ({
      ...q,
      answers: (test.randomize || exam) ? shuffle(q.answers) : q.answers
    }));
  }

  // Timer
  let timer = null;
  if(left !== null){
    timer = setInterval(() => {
      left--;
      const node = document.querySelector("#tleft");
      if(node) node.textContent = fmt(Math.max(0,left));
      saveSession({ testId, questions, state, i, startTs, left });
      if(left <= 0){
        clearInterval(timer);
        finish();
      }
    }, 1000);
  }

  function persist(){
    saveSession({ testId, questions, state, i, startTs, left });
  }

  function render(){
    const q = questions[i];
    const multi = q.type === "multi";
    const chosen = state.chosen[q.id] || (multi ? [] : null);
    const showExplain = trainer && !!q.explain && (state.hintOpen[q.id] || (multi ? chosen.length>0 : !!chosen));

    boxNode.innerHTML = `
      <div class="card-pad">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
          <div>
            <b>${test.title}</b>
            <div class="small">Вопрос ${i+1} из ${questions.length} • ${exam ? "экзамен" : "тренировка"}</div>
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            ${left !== null ? `<span class="tag">Осталось: <span id="tleft">${fmt(left)}</span></span>` : ``}
            ${trainer && q.explain ? `<button class="btn btn-ghost" id="hintBtn">${showExplain ? "Скрыть подсказку" : "Показать подсказку"}</button>` : ``}
            <button class="btn btn-ghost" id="exitBtn">Выйти</button>
          </div>
        </div>

        <hr class="sep"/>

        <h3 class="qtitle">${q.prompt}</h3>
        <div id="answers"></div>

        ${showExplain ? `<div class="callout" role="note"><b>Пояснение</b><div class="small" style="margin-top:6px">${q.explain}</div></div>` : ``}

        <div class="form-actions">
          <button class="btn btn-ghost" id="prevBtn" ${i===0 || exam ? "disabled" : ""}>Назад</button>
          <button class="btn" id="nextBtn">${i===questions.length-1 ? "Завершить" : "Дальше"}</button>
        </div>

        <div class="small" style="margin-top:10px">${q.note ? q.note : ""}</div>
      </div>
    `;

    boxNode.querySelector("#exitBtn").onclick = () => { persist(); stopAndBack(); };

    const hintBtn = boxNode.querySelector("#hintBtn");
    if(hintBtn){
      hintBtn.onclick = () => {
        state.hintOpen[q.id] = !state.hintOpen[q.id];
        persist();
        render();
      };
    }

    const ans = boxNode.querySelector("#answers");
    q.answers.forEach((a, idx) => {
      const id = `a_${q.id}_${idx}`;
      const checked = multi ? chosen.includes(a.id) : chosen === a.id;
      const row = el("label", {class:"answer", for:id},
        `<input ${multi ? "type='checkbox'" : "type='radio'"} name="q_${q.id}" id="${id}" ${checked ? "checked": ""}/>
         ${a.text}`
      );

      row.querySelector("input").addEventListener("change", (e) => {
        if(multi){
          const cur = new Set(state.chosen[q.id] || []);
          if(e.target.checked) cur.add(a.id); else cur.delete(a.id);
          state.chosen[q.id] = [...cur];
        } else {
          state.chosen[q.id] = a.id;
        }
        if(trainer && q.explain) state.hintOpen[q.id] = true;
        persist();
        render();
      });

      ans.appendChild(row);
    });

    boxNode.querySelector("#prevBtn").onclick = () => { if(exam) return; i--; persist(); render(); };
    boxNode.querySelector("#nextBtn").onclick = () => {
      if(i < questions.length-1){ i++; persist(); render(); }
      else finish();
    };
  }

  function calcResult(){
    let correct = 0;
    const mistakes = [];

    questions.forEach(q => {
      const chosen = state.chosen[q.id];
      const right = q.correct;

      let ok = false;
      if(q.type === "single"){
        ok = !!chosen && chosen === right;
      } else {
        const a = new Set(chosen || []);
        const b = new Set(right);
        ok = (a.size === b.size && [...a].every(x => b.has(x)));
      }

      if(ok) correct++;
      else mistakes.push(q);
    });

    const total = questions.length;
    const pct = Math.round((correct/total)*100);
    const spentSec = Math.round((Date.now()-startTs)/1000);

    return { correct, total, pct, spentSec, mistakes };
  }

  function finish(){
    if(timer) clearInterval(timer);

    const { correct, total, pct, spentSec, mistakes } = calcResult();

    const p = loadProgress();
    p[test.id] = { done: true, score: correct, total, pct, spentSec, at: new Date().toISOString(), mode: exam ? "exam" : "trainer" };
    saveProgress(p);

    clearSession();

    const mistakesHtml = mistakes.length
      ? `<hr class="sep"/>
         <h3 style="margin:0 0 10px">Ошибки (${mistakes.length})</h3>
         <div class="small">Вопросы, где ответ был неверным или не выбран.</div>
         <div style="margin-top:10px;display:grid;gap:10px">
           ${mistakes.slice(0,8).map(m => `<div class="tile"><b>${m.prompt}</b>${trainer && m.explain ? `<div class="small" style="margin-top:6px">${m.explain}</div>` : ``}</div>`).join("")}
         </div>
         ${mistakes.length>8 ? `<div class="small" style="margin-top:10px">Показаны первые 8 ошибок.</div>` : ``}`
      : `<hr class="sep"/><div class="callout"><b>Отлично</b><div class="small" style="margin-top:6px">Ошибок нет.</div></div>`;

    boxNode.innerHTML = `
      <div class="card-pad">
        <h2>Результат: ${pct}%</h2>
        <p>Верных: ${correct} из ${total}. Время: ${fmt(spentSec)}.</p>

        <div class="form-actions">
          <button class="btn" id="againBtn">Пройти еще раз</button>
          <button class="btn btn-ghost" id="copyBtn">Копировать JSON</button>
          <a class="btn btn-ghost" href="./tests.html">К списку тестов</a>
        </div>

        ${mistakesHtml}
      </div>
    `;

    boxNode.querySelector("#againBtn").onclick = () => runTest(data, testId, settings, null);
    boxNode.querySelector("#copyBtn").onclick = async () => {
      const payload = { testId, title: test.title, result: loadProgress()[testId] };
      try {
        await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
        boxNode.querySelector("#copyBtn").textContent = "Скопировано";
        setTimeout(() => (boxNode.querySelector("#copyBtn").textContent = "Копировать JSON"), 900);
      } catch {}
    };
  }

  // Hotkeys (только в тесте)
  function onKey(e){
    if(anyLightboxOpen()) return;
    const lbModal = document.querySelector(".settings");
    if(lbModal && !lbModal.classList.contains("hidden")) return;

    if(e.key === "Escape"){
      e.preventDefault();
      persist();
      stopAndBack();
      return;
    }

    if(e.key === "Enter"){
      const btn = document.querySelector("#nextBtn");
      if(btn){ e.preventDefault(); btn.click(); }
      return;
    }

    if(/[1-9]/.test(e.key)){
      const n = parseInt(e.key,10);
      const inputs = Array.from(document.querySelectorAll("#answers input"));
      const target = inputs[n-1];
      if(target){ e.preventDefault(); target.click(); }
    }
  }

  document.addEventListener("keydown", onKey, { passive:false });

  // Первичный рендер
  render();
}
