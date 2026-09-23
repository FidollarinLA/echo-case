import {
  can_accuse,
  case_solution,
  case_summary,
  clue_detail,
  clue_short,
  clue_title,
  score_accusation,
  suspect_intro,
  suspect_mark,
  suspect_name,
  suspect_role,
} from "/engine.js";

const people = [0, 1, 2].map((id) => ({
  id,
  name: suspect_name(id),
  role: suspect_role(id),
  mark: suspect_mark(id),
  intro: suspect_intro(id),
}));
const clues = [
  { id: "audio", moonbitId: 0, kicker: "AUDIO / 01" },
  { id: "image", moonbitId: 1, kicker: "IMAGE / 02" },
  { id: "log", moonbitId: 2, kicker: "LOG / 03" },
].map((clue) => ({
  ...clue,
  title: clue_title(clue.moonbitId),
  short: clue_short(clue.moonbitId),
  detail: clue_detail(clue.moonbitId),
}));

const state = {
  found: new Set(),
  peopleAsked: new Set(),
  selectedPerson: 0,
  attachedImage: null,
  attachedImageName: "",
  speakReplies: false,
  activeClue: null,
  busy: false,
};
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const evidenceDialog = $("#evidence-dialog");
const accuseDialog = $("#accusation-dialog");
const resultDialog = $("#result-dialog");

function renderPeople() {
  $("#case-summary").textContent = case_summary();
  $("#suspect-list").innerHTML = people.map((person) => `
    <button class="suspect-card ${person.id === state.selectedPerson ? "active" : ""}" type="button" data-person="${person.id}">
      <span class="avatar">${person.mark}</span><span class="suspect-info"><strong>${person.name}</strong><small>${person.role}</small></span><span class="suspect-arrow">›</span>
    </button>`).join("");
  $("#accuse-people").innerHTML = people.map((person) => `
    <label class="accuse-choice"><input type="radio" name="culprit" value="${person.id}" /><span>${person.name}</span><small>${person.role}</small></label>`).join("");
  const person = people.find((item) => item.id === state.selectedPerson);
  $("#chat-person").innerHTML = `<span class="avatar">${person.mark}</span><span><strong>${person.name}</strong><small>${person.role} · 夜班记录 / 文字转录</small></span>`;
}

function updateProgress() {
  const total = state.found.size;
  $("#evidence-count").textContent = `${total} / 3`;
  $("#progress-label").textContent = `${Math.round(total / 3 * 100)}%`;
  $("#progress-bar").style.width = `${total / 3 * 100}%`;
  $("#progress-detail").textContent = total === 0 ? "现场尚未检查" : total === 3 ? "三条线索全部归档" : `已归档 ${total} 条线索`;
  for (const clue of clues) {
    const card = $(`#evidence-${clue.id}`);
    const found = state.found.has(clue.id);
    card.classList.toggle("found", found);
    card.querySelector(".evidence-status").textContent = found ? "已记录 ✓" : "未检查";
  }
  const ready = can_accuse(+state.found.has("audio"), +state.found.has("image"), +state.found.has("log"), state.peopleAsked.size) === 1;
  $("#accuse-button").disabled = !ready;
  $("#accuse-hint").textContent = ready ? "关键线索已就绪，可以提交你的推理" : total < 2 ? `再检查 ${2 - total} 条线索后即可提交` : "先与至少一位夜班人员交谈，再提交推理";
  $$("#cite-list input").forEach((input) => { input.disabled = !state.found.has(input.value); });
  updateAccusationState();
}

function openClue(id) {
  const clue = clues.find((item) => item.id === id);
  if (!clue) return;
  state.activeClue = clue;
  $("#modal-kicker").textContent = clue.kicker;
  $("#modal-title").textContent = clue.title;
  const content = $("#modal-content");
  if (id === "audio") {
    content.innerHTML = `<p>从走廊尽头的监控麦克风中，恢复出一段 8 秒录音。</p><button class="secondary-button" id="play-clue" type="button">▶　播放现场录音 / 00:08</button><div class="transcript" id="audio-transcript">录音转写将在试听后显示。</div><p>注意提示音的节奏，以及最后一句话。</p>`;
    $("#play-clue").addEventListener("click", () => {
      playSignal();
      $("#audio-transcript").textContent = "[杂音] 三短一长……手动回路，数到十二。";
      $("#mark-evidence").dataset.listened = "true";
      $("#mark-evidence").textContent = "记录线索　✓";
    });
  } else if (id === "image") {
    content.innerHTML = `<img src="/scene.svg" alt="控制台现场照片" style="width:100%;height:auto;border-radius:4px;border:1px solid #405148;margin-bottom:10px" /><p>${clue.detail}</p><p>图像为本项目绘制的合成演示素材，不指向真实人员或事件。</p>`;
  } else {
    content.innerHTML = `<div class="transcript">21:07:14　ROUTE / NORTH-03　MAIN → MAINTENANCE<br />21:08:02　CHECKSUM / PASS　SOURCE ARCHIVE: INTACT<br />OPERATOR TOKEN / LL-07</div><p>${clue.detail}</p>`;
  }
  $("#mark-evidence").textContent = state.found.has(id) ? "线索已归档 ✓" : id === "audio" ? "先试听，再记录" : "记录线索　✓";
  $("#mark-evidence").disabled = state.found.has(id);
  $("#mark-evidence").dataset.listened = "false";
  evidenceDialog.showModal();
}

function playSignal() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const now = ctx.currentTime;
  const notes = [880, 880, 880, 660];
  notes.forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    const start = now + 5.6 + index * 0.36;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.08, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.22);
  });
  const noise = ctx.createBufferSource();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 8, ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++) channel[i] = (Math.random() * 2 - 1) * 0.08;
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1150;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.035, now + 0.08);
  noiseGain.gain.setValueAtTime(0.035, now + 7.7);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 7.95);
  noise.connect(filter).connect(noiseGain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 8);
  setTimeout(() => ctx.close(), 8500);
}

function appendMessage(role, text, time = "21:08") {
  const row = document.createElement("div");
  row.className = `chat-message ${role}`;
  const stamp = document.createElement("span");
  stamp.className = "chat-time";
  stamp.textContent = time;
  const message = document.createElement("p");
  message.textContent = text;
  row.append(stamp, message);
  $("#chat-scroll").append(row);
  $("#chat-scroll").scrollTop = $("#chat-scroll").scrollHeight;
}

async function sendQuestion(question) {
  if (!question.trim() || state.busy) return;
  state.busy = true;
  appendMessage("user", question.trim());
  const person = people.find((item) => item.id === state.selectedPerson);
  state.peopleAsked.add(person.id);
  const evidence = clues.filter((clue) => state.found.has(clue.id)).map((clue) => clue.short);
  const footnote = $("#chat-footnote");
  footnote.textContent = "对方正在整理自己的说法…";
  $("#chat-input").disabled = true;
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ suspect: person.name, suspectId: person.id, question, evidence, imageDataUrl: state.attachedImage }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "暂时无法连接模型");
    appendMessage("npc", result.text);
    const mode = result.mode === "model"
      ? "AI 对话已启用"
      : result.imageIgnored ? "演示模式不会分析附图；连接视觉模型后可启用图像理解" : "演示模式：固定角色回答，不需要 API 密钥";
    footnote.textContent = mode;
    $(".ai-badge").innerHTML = `<i></i> ${result.mode === "model" ? "AI / GROUNDED" : "AI / SCRIPT"}`;
    if (state.speakReplies && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(result.text));
    }
  } catch (error) {
    appendMessage("npc", `连接出现问题：${error.message}。可以先按固定剧本继续试玩。`);
    footnote.textContent = "暂时无法连接服务，请检查本地服务或模型配置。";
  } finally {
    state.busy = false;
    updateProgress();
    $("#chat-input").disabled = false;
    $("#chat-input").focus();
    state.attachedImage = null;
    state.attachedImageName = "";
    $("#upload-name").textContent = "附图";
    $("#image-upload").value = "";
  }
}

function updateAccusationState() {
  const personChosen = $("input[name='culprit']:checked") !== null;
  const cited = $$("#cite-list input:checked").length;
  const ready = personChosen && cited >= 2;
  $("#submit-accusation").disabled = !ready;
  $("#submit-hint").textContent = ready ? "证据链已具备，提交后将锁定结论" : "先选择一位当事人和至少两条已发现的线索";
}

function openAccusation() {
  $("#cite-list").innerHTML = clues.map((clue) => `
    <label class="cite-item"><input type="checkbox" value="${clue.id}" ${state.found.has(clue.id) ? "" : "disabled"} /><span>${clue.title}</span></label>`).join("");
  updateAccusationState();
  accuseDialog.showModal();
}

function closeDialogs() {
  for (const dialog of [evidenceDialog, accuseDialog, resultDialog]) dialog.close();
}

function submitAccusation() {
  const personId = Number($("input[name='culprit']:checked")?.value ?? -1);
  const citedIds = $$("#cite-list input:checked").map((input) => input.value);
  const score = score_accusation(
    personId,
    +citedIds.includes("audio"),
    +citedIds.includes("image"),
    +citedIds.includes("log"),
  );
  const correct = personId === 1;
  $("#result-title").textContent = correct ? "信号找回了。" : "这条推理还差一点。";
  $("#result-copy").textContent = correct
    ? case_solution()
    : "信号确实被切进维护回路，但操作日志和现场痕迹指向另一位当事人。对照时间戳，再听一次录音试试。";
  $("#result-score").textContent = String(score);
  $("#result-seal").textContent = correct && score === 100 ? "ECHO / VERIFIED" : correct ? "ECHO / PARTIAL" : "ECHO / UNRESOLVED";
  $("#result-proof").innerHTML = `<div><b>判定依据</b><span>MoonBit 固定规则 · ${citedIds.length} 条引用线索</span></div><div><b>事实核对</b><span>21:07:14 切换记录 → LL-07 → 林岚</span></div><div><b>线索说明</b><span>${citedIds.map((id) => clues.find((clue) => clue.id === id)?.title).join("、") || "未引用线索"}</span></div>`;
  closeDialogs();
  resultDialog.showModal();
}

function resetGame() {
  closeDialogs();
  state.found.clear();
  state.peopleAsked.clear();
  state.selectedPerson = 0;
  state.attachedImage = null;
  $("#chat-scroll").innerHTML = `<div class="chat-welcome"><span class="chat-time">21:08</span><p>你可以直接提问，也可以先检查线索，再拿证据追问。角色只会回应自己知道的事。</p></div>`;
  $("#chat-footnote").textContent = "演示模式：固定角色回答，不需要 API 密钥";
  $(".ai-badge").innerHTML = "<i></i> AI / SCRIPT";
  renderPeople();
  updateProgress();
}

renderPeople();
updateProgress();

document.addEventListener("click", (event) => {
  const clueButton = event.target.closest("[data-evidence]");
  if (clueButton) openClue(clueButton.dataset.evidence);
  const closeButton = event.target.closest("[data-close]");
  if (closeButton) closeButton.closest("dialog").close();
});
$("#mark-evidence").addEventListener("click", () => {
  if (!state.activeClue || state.found.has(state.activeClue.id)) return;
  if (state.activeClue.id === "audio" && $("#mark-evidence").dataset.listened !== "true") {
    $("#audio-transcript").textContent = "请先播放录音，再把听到的线索记入档案。";
    return;
  }
  state.found.add(state.activeClue.id);
  evidenceDialog.close();
  updateProgress();
});
$("#suspect-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-person]");
  if (!button) return;
  state.selectedPerson = Number(button.dataset.person);
  renderPeople();
  $("#chat-input").focus();
});
$("#chat-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#chat-input");
  const question = input.value.trim();
  if (!question) return;
  input.value = "";
  void sendQuestion(question);
});
$("#accuse-button").addEventListener("click", openAccusation);
$("#accuse-people").addEventListener("change", (event) => {
  $$(".accuse-choice").forEach((label) => label.classList.toggle("selected", label.contains(event.target)));
  updateAccusationState();
});
$("#cite-list").addEventListener("change", updateAccusationState);
$("#submit-accusation").addEventListener("click", submitAccusation);
$("#restart-button").addEventListener("click", resetGame);
$("#listen-scene").addEventListener("click", () => {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance("北塔观测站，夜班二十一点零七分。主线路突然切换。信号本身仍在，但档案索引里没有留下新的目的地。"));
});
$("#speak-toggle").addEventListener("click", (event) => {
  state.speakReplies = !state.speakReplies;
  event.currentTarget.style.color = state.speakReplies ? "var(--mint)" : "";
  event.currentTarget.title = state.speakReplies ? "朗读已开启" : "朗读回复";
});
$("#image-upload").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/") || file.size > 1_000_000) {
    $("#upload-name").textContent = "图片需小于 1 MB";
    event.target.value = "";
    return;
  }
  state.attachedImage = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  state.attachedImageName = file.name;
  $("#upload-name").textContent = file.name.length > 13 ? `${file.name.slice(0, 10)}…` : file.name;
});
$("#voice-input").addEventListener("click", () => {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    $("#chat-footnote").textContent = "当前浏览器未提供语音识别，可直接输入文字。";
    return;
  }
  const recognition = new Recognition();
  recognition.lang = "zh-CN";
  recognition.interimResults = false;
  recognition.onresult = (event) => { $("#chat-input").value = event.results[0][0].transcript; $("#chat-input").focus(); };
  recognition.onerror = () => { $("#chat-footnote").textContent = "语音没有识别成功，请再试一次或输入文字。"; };
  recognition.start();
});
