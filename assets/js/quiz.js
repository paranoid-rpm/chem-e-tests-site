const STORE_KEY = "chem_quiz_progress_v1";

function loadProgress(){
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); }
  catch { return {}; }
}
function saveProgress(obj){
  localStorage.setItem(STORE_KEY, JSON.stringify(obj));
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

  data.tests.forEach(t => {
    const done = progress[t.id]?.done;
    const item = el("div", {class:"item", "data-id": t.id},
      `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
         <div>
           <b>${t.title}</b><div class="small">${t.description}</div>
           <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
             <span class="tag">${t.category}</span>
             <span class="tag">${t.questions.length} вопросов</span>
             ${t.timerSec ? `<span class="tag">таймер</span>` : ``}
           </div>
         </div>
         <span class="tag">${done ? "пройден" : "новый"}</span>
       </div>`
    );
    item.addEventListener("click", () => runTest(data, t.id));
    listNode.appendChild(item);
  });

  boxNode.innerHTML = `
    <div class="card-pad">
      <h2>Выбери тест слева</h2>
      <p>Результаты сохраняются в этом браузере.</p>
    </div>
  `;
}

async function runTest(data, testId){
  const test = data.tests.find(t => t.id === testId);
  const boxNode  = document.querySelector("#quizBox");
  const progress = loadProgress();

  let questions = test.randomize ? shuffle(test.questions) : [...test.questions];
  questions = questions.map(q => ({
    ...q,
    answers: test.randomize ? shuffle(q.answers) : q.answers
  }));

  let i = 0;
  let correct = 0;
  let startTs = Date.now();
  let left = test.timerSec || null;
  let timer = null;

  const state = { chosen: {} };

  function render(){
    const q = questions[i];
    const multi = q.type === "multi";
    const chosen = state.chosen[q.id] || (multi ? [] : null);

    boxNode.innerHTML = `
      <div class="card-pad">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
          <div>
            <b>${test.title}</b>
            <div class="small">Вопрос ${i+1} из ${questions.length}</div>
          </div>
          <div style="display:flex;gap:10px;align-items:center">
            ${left !== null ? `<span class="tag">Осталось: <span id="tleft">${fmt(left)}</span></span>` : ``}
            <button class="btn btn-ghost" id="exitBtn">Выйти</button>
          </div>
        </div>

        <hr class="sep"/>

        <h3 class="qtitle">${q.prompt}</h3>
        <div id="answers"></div>

        <div class="form-actions">
          <button class="btn btn-ghost" id="prevBtn" ${i===0 ? "disabled" : ""}>Назад</button>
          <button class="btn" id="nextBtn">${i===questions.length-1 ? "Завершить" : "Дальше"}</button>
        </div>

        <div class="small" style="margin-top:10px">${q.note ? q.note : ""}</div>
      </div>
    `;

    boxNode.querySelector("#exitBtn").onclick = () => stopAndBack();
    const ans = boxNode.querySelector("#answers");

    q.answers.forEach((a, idx) => {
      const id = `a_${q.id}_${idx}`;
      const checked = multi ? chosen.includes(a.id) : chosen === a.id;
      const row = el("label", {class:"answer", for:id},
        `<input ${multi ? "type='checkbox'" : "type='radio'"} name="q_${q.id}" id="${id}" ${checked ? "checked":""}/>
         ${a.text}`
      );

      row.addEventListener("click", (e) => {
        // чтобы клик по label не дергал дважды
        if(e.target.tagName.toLowerCase() === "input") return;
        const input = row.querySelector("input");
        input.checked = !input.checked;
      });

      row.querySelector("input").addEventListener("change", (e) => {
        if(multi){
          const cur = new Set(state.chosen[q.id] || []);
          if(e.target.checked) cur.add(a.id); else cur.delete(a.id);
          state.chosen[q.id] = [...cur];
        } else {
          state.chosen[q.id] = a.id;
        }
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
    questions.forEach(q => {
      const chosen = state.chosen[q.id];
      const right = q.correct;
      if(q.type === "single"){
        if(chosen && chosen === right) correct++;
      } else {
        const a = new Set(chosen || []);
        const b = new Set(right);
        if(a.size === b.size && [...a].every(x => b.has(x))) correct++;
      }
    });

    const total = questions.length;
    const pct = Math.round((correct/total)*100);
    const spentSec = Math.round((Date.now()-startTs)/1000);

    const p = loadProgress();
    p[test.id] = { done: true, score: correct, total, pct, spentSec, at: new Date().toISOString() };
    saveProgress(p);

    boxNode.innerHTML = `
      <div class="card-pad">
        <h2>Готово: ${pct}%</h2>
        <p>Верных: ${correct} из ${total}. Время: ${fmt(spentSec)}.</p>
        <div class="form-actions">
          <button class="btn" id="againBtn">Пройти еще раз</button>
          <a class="btn btn-ghost" href="./tests.html">К списку тестов</a>
        </div>
        <p class="small">Подсказка: включи randomize в tests.json, чтобы вопросы перемешивались.</p>
      </div>
    `;
    boxNode.querySelector("#againBtn").onclick = () => runTest(data, testId);
  }

  function fmt(sec){
    const m = Math.floor(sec/60);
    const s = sec%60;
    return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }

  function stopAndBack(){
    if(timer) clearInterval(timer);
    window.location.href = "./tests.html";
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
