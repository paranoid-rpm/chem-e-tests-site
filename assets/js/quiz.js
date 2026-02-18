import { buildQuestions } from "./questionBank.js";

const STORE_KEY = "chem_quiz_progress_v1";
const SETTINGS_KEY = "chem_quiz_settings_v1";

function loadProgress(){
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); }
  catch { return {}; }
}
function saveProgress(obj){
  localStorage.setItem(STORE_KEY, JSON.stringify(obj));
}

function loadSettings(){
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{\"trainer\":true}");
  } catch {
    return { trainer: true };
  }
}
function saveSettings(obj){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj));
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

export async function initQuiz(){
  const listNode = document.querySelector("#quizList");
  const boxNode  = document.querySelector("#quizBox");
  if(!listNode || !boxNode) return;

  const data = await fetch("./assets/data/tests.json").then(r => r.json());
  const progress = loadProgress();
  const settings = loadSettings();

  const search = document.querySelector("#testSearch");
  const catSel = document.querySelector("#testCategory");
  const trainerMode = document.querySelector("#trainerMode");
  const progressInfo = document.querySelector("#progressInfo");

  if(trainerMode){
    trainerMode.checked = !!settings.trainer;
    trainerMode.addEventListener("change", () => {
      settings.trainer = trainerMode.checked;
      saveSettings(settings);
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
    if(!q) return true;
    const hay = `${t.title} ${t.description} ${t.category}`.toLowerCase();
    return hay.includes(q);
  }

  function renderList(){
    listNode.innerHTML = "";
    const tests = data.tests.filter(matches);

    if(!tests.length){
      listNode.appendChild(el("div", {class:"small"}, "Ничего не найдено. Измени запрос или фильтр."));
      return;
    }

    tests.forEach(t => {
      const done = progress[t.id]?.done;
      const pct = progress[t.id]?.pct;
      const qCount = t.questions?.length || t.questionIds?.length || t.questionCount || 10;
      const item = el("div", {class:"item", "data-id": t.id},
        `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
           <div>
             <b>${t.title}</b>
             <div class="small">${t.description}</div>
             <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
               <span class="tag">${t.category}</span>
               <span class="tag">${qCount} вопросов</span>
               ${t.timerSec ? `<span class="tag">таймер</span>` : ``}
               ${done && typeof pct === "number" ? `<span class="tag">${pct}%</span>` : ``}
             </div>
           </div>
           <span class="tag">${done ? "пройден" : "новый"}</span>
         </div>`
      );
      item.addEventListener("click", () => runTest(data, t.id, loadSettings()));
      listNode.appendChild(item);
    });
  }

  search?.addEventListener("input", renderList);
  catSel?.addEventListener("change", renderList);

  boxNode.innerHTML = `
    <div class="card-pad">
      <h2>Выбери тест</h2>
      <p>Режим тренировки показывает подсказки и пояснения (если они есть в вопросах).</p>
      <p class="small">Результаты сохраняются на этом устройстве (в браузере).</p>
    </div>
  `;

  renderList();
}

async function runTest(data, testId, settings){
  const test = data.tests.find(t => t.id === testId);
  const boxNode  = document.querySelector("#quizBox");

  let questions = [];

  if(Array.isArray(test.questions) && test.questions.length){
    questions = [...test.questions];
  } else if(Array.isArray(test.questionIds) && test.questionIds.length && data.questionBank){
    questions = test.questionIds
      .map((qid, idx) => ({...data.questionBank[qid], id: `q${idx+1}`}))
      .filter(Boolean);
  } else if(test.template){
    questions = buildQuestions(test);
  }

  if(test.randomize) questions = shuffle(questions);
  questions = questions.map(q => ({
    ...q,
    answers: test.randomize ? shuffle(q.answers) : q.answers
  }));

  let i = 0;
  let correct = 0;
  let startTs = Date.now();
  let left = test.timerSec || null;
  let timer = null;

  const state = { chosen: {}, hintOpen: {} };

  function fmt(sec){
    const m = Math.floor(sec/60);
    const s = sec%60;
    return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }

  function stopAndBack(){
    if(timer) clearInterval(timer);
    window.location.href = "./tests.html";
  }

  function render(){
    const q = questions[i];
    const multi = q.type === "multi";
    const chosen = state.chosen[q.id] || (multi ? [] : null);
    const showExplain = settings?.trainer && !!q.explain && (state.hintOpen[q.id] || (multi ? chosen.length>0 : !!chosen));

    boxNode.innerHTML = `
      <div class="card-pad">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
          <div>
            <b>${test.title}</b>
            <div class="small">Вопрос ${i+1} из ${questions.length} • ${settings?.trainer ? "тренировка" : "контроль"}</div>
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            ${left !== null ? `<span class="tag">Осталось: <span id="tleft">${fmt(left)}</span></span>` : ``}
            ${q.explain ? `<button class="btn btn-ghost" id="hintBtn">${showExplain ? "Скрыть подсказку" : "Показать подсказку"}</button>` : ``}
            <button class="btn btn-ghost" id="exitBtn">Выйти</button>
          </div>
        </div>

        <hr class="sep"/>

        <h3 class="qtitle">${q.prompt}</h3>
        <div id="answers"></div>

        ${showExplain ? `<div class="callout" role="note"><b>Пояснение</b><div class="small" style="margin-top:6px">${q.explain}</div></div>` : ``}

        <div class="form-actions">
          <button class="btn btn-ghost" id="prevBtn" ${i===0 ? "disabled" : ""}>Назад</button>
          <button class="btn" id="nextBtn">${i===questions.length-1 ? "Завершить" : "Дальше"}</button>
        </div>

        <div class="small" style="margin-top:10px">${q.note ? q.note : ""}</div>
      </div>
    `;

    boxNode.querySelector("#exitBtn").onclick = () => stopAndBack();

    const hintBtn = boxNode.querySelector("#hintBtn");
    if(hintBtn){
      hintBtn.onclick = () => {
        state.hintOpen[q.id] = !state.hintOpen[q.id];
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
        if(settings?.trainer && q.explain) state.hintOpen[q.id] = true;
        render();
      });

      ans.appendChild(row);
    });

    boxNode.querySelector("#prevBtn").onclick = () => { i--; render(); };
    boxNode.querySelector("#nextBtn").onclick = () => {
      if(i < questions.length-1){ i++; render(); }
      else finish();
    };
  }

  function finish(){
    if(timer) clearInterval(timer);

    correct = 0;
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

    const p = loadProgress();
    p[test.id] = { done: true, score: correct, total, pct, spentSec, at: new Date().toISOString() };
    saveProgress(p);

    const mistakesHtml = mistakes.length
      ? `<hr class="sep"/>
         <h3 style="margin:0 0 10px">Ошибки (${mistakes.length})</h3>
         <div class="small">Вопросы, где ответ был неверным или не выбран.</div>
         <div style="margin-top:10px;display:grid;gap:10px">
           ${mistakes.slice(0,8).map(m => `<div class="tile"><b>${m.prompt}</b>${m.explain ? `<div class="small" style="margin-top:6px">${m.explain}</div>` : ``}</div>`).join("")}
         </div>
         ${mistakes.length>8 ? `<div class="small" style="margin-top:10px">Показаны первые 8 ошибок.</div>` : ``}`
      : `<hr class="sep"/><div class="callout"><b>Отлично</b><div class="small" style="margin-top:6px">Ошибок нет.</div></div>`;

    boxNode.innerHTML = `
      <div class="card-pad">
        <h2>Результат: ${pct}%</h2>
        <p>Верных: ${correct} из ${total}. Время: ${fmt(spentSec)}.</p>
        <div class="form-actions">
          <button class="btn" id="againBtn">Пройти еще раз</button>
          <a class="btn btn-ghost" href="./tests.html">К списку тестов</a>
        </div>
        ${mistakesHtml}
      </div>
    `;
    boxNode.querySelector("#againBtn").onclick = () => runTest(data, testId, settings);
  }

  if(left !== null){
    timer = setInterval(() => {
      left--;
      const node = document.querySelector("#tleft");
      if(node) node.textContent = fmt(Math.max(0,left));
      if(left <= 0){
        clearInterval(timer);
        finish();
      }
    }, 1000);
  }

  render();
}
