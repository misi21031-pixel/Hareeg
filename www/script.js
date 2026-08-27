/* ===================================================== التخزين والإعدادات ===================================================== */

const STORAGE = {
  players: "hareeg_players",
  history: "hareeg_history",
  settings: "hareeg_settings",
};

let settings = JSON.parse(localStorage.getItem(STORAGE.settings) || "{}");

let players = JSON.parse(localStorage.getItem(STORAGE.players) || "[]");

let history = JSON.parse(localStorage.getItem(STORAGE.history) || "[]");

let firePoint = Number(settings.firePoint || 31);

let zoneStart = Number(settings.zoneStart || 17);

/* ===================================================== اهتزاز خفيف (Haptic feedback) ===================================================== */

function vibrate(ms) {
  if (navigator.vibrate) {
    navigator.vibrate(ms || 15);
  }
}

/* ===================================================== حالة العشرة الحالية ===================================================== */

let selectedPlayers = [];

let gamePlayers = [];

let round = 1;

let roundPlayers = [];

let currentRoundPoints = [];

let currentRoundErrors = [];

let roundHistory = [];

let currentInputIndex = -1;

let currentInputValue = "0";

let currentErrorAmount = 0;

let currentHistoryIndex = -1;

let feedbackType = "suggestion";

let toastTimer;

let lastAction = null;

const ACTIVE_GAME_KEY = "hareeg_active_game";

/* ===================================================== ألوان اللاعبين ===================================================== */

const PLAYER_COLORS = [
  "#E87524",
  "#2E86AB",
  "#8E5DB0",
  "#C94A45",
  "#3E9B6F",
  "#B5762E",
  "#5B6FBF",
  "#C0567E",
];

function getPlayerColor(name) {
  let hash = 0;

  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % PLAYER_COLORS.length;

  return PLAYER_COLORS[index];
}

function avatarHTML(name) {
  const color = getPlayerColor(name);

  const letter = (name.trim()[0] || "؟").toUpperCase();

  return ` <div class="avatar player-avatar" style="background:${color}22;color:${color}"> ${esc(letter)} </div> `;
}

/* ===================================================== البداية ===================================================== */

window.addEventListener("load", () => {
  window.history.replaceState({ screen: "homeScreen" }, "", "#homeScreen");

  setTimeout(() => {
    document.getElementById("intro").style.opacity = "0";

    setTimeout(() => {
      document.getElementById("intro").style.display = "none";

      document.getElementById("app").classList.add("visible");
    }, 900);
  }, 2200);

  renderHistory();

  renderLibrary();

  updateRuleScreen();

  renderHomeLastTen();

  renderResumeCard();

  /* اختصارات الأيقونة (Long-press shortcuts) */

  const params = new URLSearchParams(window.location.search);

  const action = params.get("action");

  if (action === "newten") {
    newTen();
  }

  if (action === "history") {
    showScreen("historyScreen");
  }
});

/* ===================================================== التنقل ===================================================== */

/* ===================================================== دعم زر الرجوع بالهاتف (History) ===================================================== */

let __currentScreenId = "homeScreen";

function __pushScreenState(id) {
  if (id === __currentScreenId) {
    return;
  }

  window.history.pushState({ screen: id }, "", "#" + id);

  __currentScreenId = id;
}

window.addEventListener("popstate", (e) => {
  const openModal = document.querySelector(".modal.show");

  if (openModal) {
    closeModal(openModal.id);

    window.history.pushState(
      { screen: __currentScreenId },
      "",
      "#" + __currentScreenId
    );

    return;
  }

  const targetId = e.state && e.state.screen ? e.state.screen : "homeScreen";

  showScreen(targetId, true);
});

new MutationObserver((mutations) => {
  mutations.forEach((m) => {
    if (m.attributeName !== "class") {
      return;
    }

    const el = m.target;

    if (
      el.classList &&
      el.classList.contains("modal") &&
      el.classList.contains("show")
    ) {
      vibrate(10);

      window.history.pushState(
        { screen: __currentScreenId, modal: el.id },
        "",
        "#" + el.id
      );
    }
  });
}).observe(document.body, {
  attributes: true,
  subtree: true,
  attributeFilter: ["class"],
});

function showScreen(id, fromPopState) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });

  const screen = document.getElementById(id);

  if (screen) {
    screen.classList.add("active");
  }

  updateNav(id);

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  const nav = document.querySelector(`[data-screen="${id}"]`);

  if (nav) {
    nav.classList.add("active");
  }

  window.scrollTo(0, 0);

  if (id === "historyScreen") {
    renderHistory();
  }

  if (id === "libraryScreen") {
    renderLibrary();
  }

  if (!fromPopState) {
    __pushScreenState(id);
  } else {
    __currentScreenId = id;
  }
}

function updateNav(id) {
  const nav = document.getElementById("nav");

  const hide = [
    "newTenScreen",
    "roundPlayersScreen",
    "gameScreen",
    "pointsScreen",
    "errorScreen",
    "endTenScreen",
    "historyDetailScreen",
    "libraryScreen",
    "statsScreen",
    "rulesScreen",
    "backupScreen",
    "aboutScreen",
  ];

  nav.style.display = hide.includes(id) ? "none" : "flex";
}

/* ===================================================== الرئيسية ===================================================== */

function renderHomeLastTen() {
  const box = document.getElementById("homeLastTen");

  if (!history.length) {
    box.innerHTML = ` <div class="empty"> 📋<br><br> لا توجد عشرات سابقة </div> `;

    return;
  }

  const latest = history[0];

  const winner = latest.players.find((p) => p.status === "winner");

  const homeStreak = winStreakAt(0);

  box.innerHTML = ` <div class="section-title"> آخر عشرة </div> <button class="history-item" onclick="openHistory(0)"> <div class="history-head"> <div class="avatar"> 📋 </div> <div class="history-info"> <div class="history-title"> العشرة ${history.length} </div> <div class="history-date"> ${formatDate(latest.date)} ${ homeStreak >= 2 ? ` • 🔥 ${homeStreak} فوز متتالي` : "" } </div> </div> <div class="arrow"> ‹ </div> </div> <div class="history-players"> ${latest.players.map((p) => esc(p.name)).join(" • ")} ${winner ? " • 👑 " + esc(winner.name) : ""} </div> </button> `;
}

/* ===================================================== عشرة جديدة ===================================================== */

function newTen() {
  if (localStorage.getItem(ACTIVE_GAME_KEY)) {
    const ok = confirm(
      "لديك عشرة جارية حاليًا. بدء عشرة جديدة سيفقدك تقدمها. متابعة؟"
    );

    if (!ok) {
      return;
    }

    clearGameState();

    renderResumeCard();
  }

  vibrate(15);

  lastAction = null;

  selectedPlayers = [];

  firePoint = Number(settings.firePoint || 31);

  renderSelected();

  document.getElementById("fireValue").textContent = firePoint;

  showScreen("newTenScreen");
}

function changeFire(value) {
  vibrate(12);

  firePoint += value;

  if (firePoint < 1) {
    firePoint = 1;
  }

  if (firePoint > 999) {
    firePoint = 999;
  }

  document.getElementById("fireValue").textContent = firePoint;
}

/* ===================================================== اللاعبين المختارين ===================================================== */

function renderSelected() {
  const box = document.getElementById("selectedPlayers");

  box.innerHTML = "";

  selectedPlayers.forEach((name, index) => {
    const item = document.createElement("div");

    item.className = "slot";

    item.innerHTML = ` ${avatarHTML(name)} <div class="slot-name"> ${esc(name)} </div> <button class="remove" onclick="removeSelected(${index})"> × </button> `;

    box.appendChild(item);
  });
}

function removeSelected(index) {
  selectedPlayers.splice(index, 1);

  renderSelected();
}

/* ===================================================== إضافة لاعب للعشرة ===================================================== */

function openAddPlayerMenu() {
  if (selectedPlayers.length >= 12) {
    toast("الحد الأقصى 12 لاعبًا بالعشرة");

    return;
  }

  document.getElementById("addPlayerMenu").classList.add("show");
}

function openLibrarySelector() {
  closeModal("addPlayerMenu");

  document.getElementById("playerSearch").value = "";

  renderSelector();

  document.getElementById("librarySelector").classList.add("show");
}

function renderSelector() {
  const box = document.getElementById("selectorList");

  const search = document
    .getElementById("playerSearch")
    .value.trim()
    .toLowerCase();

  box.innerHTML = "";

  const list = players.filter((name) => name.toLowerCase().includes(search));

  if (!list.length) {
    box.innerHTML = ` <div class="empty"> لا يوجد لاعبون محفوظون </div> `;

    return;
  }

  list.forEach((name) => {
    const exists = selectedPlayers.includes(name);

    const btn = document.createElement("button");

    btn.className = "select-player";

    btn.innerHTML = ` ${avatarHTML(name)} <div style="flex:1"> ${esc(name)} </div> <div> ${exists ? "✓" : "‹"} </div> `;

    if (!exists) {
      btn.onclick = () => {
        if (selectedPlayers.length >= 12) {
          toast("الحد الأقصى 12 لاعبًا بالعشرة");

          return;
        }

        selectedPlayers.push(name);

        renderSelected();

        closeModal("librarySelector");
      };
    }

    box.appendChild(btn);
  });
}

function openTemporaryPlayer() {
  closeModal("addPlayerMenu");

  document.getElementById("temporaryName").value = "";

  document.getElementById("temporaryPlayer").classList.add("show");
}

function addTemporaryPlayer() {
  const name = document.getElementById("temporaryName").value.trim();

  if (!name) {
    toast("اكتب اسم اللاعب");

    return;
  }

  if (selectedPlayers.includes(name)) {
    toast("اللاعب موجود بالفعل");

    return;
  }

  if (selectedPlayers.length >= 12) {
    toast("الحد الأقصى 12 لاعبًا بالعشرة");

    return;
  }

  selectedPlayers.push(name);

  renderSelected();

  closeModal("temporaryPlayer");
}

/* ===================================================== بدء العشرة ===================================================== */

function startTen() {
  if (selectedPlayers.length < 2) {
    toast("أضف لاعبين على الأقل");

    return;
  }

  round = 1;

  roundHistory = [];

  gamePlayers = selectedPlayers.map((name) => ({
    name: name,

    total: 0,

    wins: 0,

    fifties: 0,

    errors3: 0,

    errors14: 0,

    burned: false,

    roundTotal: 0,
  }));

  document.getElementById("gameFire").textContent =
    "🔥 نقطة الحريق: " + firePoint;

  beginRound();
}

/* ===================================================== بداية كل جولة (اختيار لاعبي الجولة) ===================================================== */

function eligiblePlayerIndexes() {
  return gamePlayers.map((p, i) => i).filter((i) => !gamePlayers[i].burned);
}

function beginRound() {
  const eligible = eligiblePlayerIndexes();

  if (eligible.length <= 4) {
    roundPlayers = eligible;

    activateRound();

    return;
  }

  openRoundPlayers();
}

function openRoundPlayers() {
  roundPlayers = [];

  renderRoundPlayers();

  showScreen("roundPlayersScreen");
}

function toggleRoundPlayer(index) {
  const pos = roundPlayers.indexOf(index);

  if (pos > -1) {
    roundPlayers.splice(pos, 1);
  } else {
    if (roundPlayers.length >= 4) {
      toast("بحد أقصى 4 لاعبين بالجولة");

      return;
    }

    roundPlayers.push(index);
  }

  vibrate(10);

  renderRoundPlayers();
}

function renderRoundPlayers() {
  const box = document.getElementById("roundPlayersList");

  if (!box) {
    return;
  }

  box.innerHTML = "";

  eligiblePlayerIndexes().forEach((index) => {
    const player = gamePlayers[index];

    const isSelected = roundPlayers.includes(index);

    const btn = document.createElement("button");

    btn.className = "select-player" + (isSelected ? " active" : "");

    btn.innerHTML = ` ${avatarHTML(player.name)} <div style="flex:1"> ${esc(player.name)} </div> <div> ${isSelected ? "✓" : "‹"} </div> `;

    btn.onclick = () => toggleRoundPlayer(index);

    box.appendChild(btn);
  });

  const countLabel = document.getElementById("roundPlayersCount");

  if (countLabel) {
    countLabel.textContent = roundPlayers.length + " / 4";
  }
}

function confirmRoundPlayers() {
  if (roundPlayers.length < 2) {
    toast("اختر لاعبين اثنين على الأقل");

    return;
  }

  vibrate(15);

  activateRound();
}

function activateRound() {
  currentRoundPoints = gamePlayers.map((player, index) => {
    if (player.burned) {
      return 0;
    }

    if (!roundPlayers.includes(index)) {
      return undefined;
    }

    return null;
  });

  currentRoundErrors = gamePlayers.map(() => ({
    plus3: 0,
    plus14: 0,
  }));

  gamePlayers.forEach((player) => {
    player.roundTotal = 0;
  });

  renderGame();

  saveGameState();

  showScreen("gameScreen");
}

/* ===================================================== استكمال العشرة (بعد إغلاق التطبيق) ===================================================== */

function saveGameState() {
  if (!gamePlayers.length) {
    return;
  }

  localStorage.setItem(
    ACTIVE_GAME_KEY,
    JSON.stringify({
      gamePlayers,
      round,
      currentRoundPoints,
      currentRoundErrors,
      roundHistory,
      firePoint,
      zoneStart,
    })
  );
}

function clearGameState() {
  localStorage.removeItem(ACTIVE_GAME_KEY);
}

function resumeGame() {
  const raw = localStorage.getItem(ACTIVE_GAME_KEY);

  if (!raw) {
    return;
  }

  const s = JSON.parse(raw);

  gamePlayers = s.gamePlayers;
  round = s.round;
  currentRoundPoints = s.currentRoundPoints;
  currentRoundErrors = s.currentRoundErrors;
  roundHistory = s.roundHistory || [];
  firePoint = s.firePoint;
  zoneStart = s.zoneStart;

  lastAction = null;

  document.getElementById("gameFire").textContent =
    "🔥 نقطة الحريق: " + firePoint;

  renderGame();

  showScreen("gameScreen");
}

function renderResumeCard() {
  const box = document.getElementById("homeResumeCard");

  if (!box) {
    return;
  }

  const raw = localStorage.getItem(ACTIVE_GAME_KEY);

  if (!raw) {
    box.innerHTML = "";

    return;
  }

  let s;

  try {
    s = JSON.parse(raw);
  } catch (e) {
    box.innerHTML = "";
    return;
  }

  if (!s || !s.gamePlayers || !s.gamePlayers.length) {
    box.innerHTML = "";
    return;
  }

  box.innerHTML = ` <button class="outline-btn resume-btn" onclick="resumeGame()"> ↩️ أكمل العشرة الحالية (الجولة ${s.round}) </button> `;
}

/* ===================================================== حالة اللاعب ===================================================== */

function playerStatus(player, index) {
  if (player.burned) {
    return {
      text: "🔥 حارق",
      cls: "burn",
    };
  }

  if (
    roundPlayers.length &&
    index !== undefined &&
    !roundPlayers.includes(index)
  ) {
    return {
      text: "قاعد",
      cls: "sitting",
    };
  }

  if (player.total >= zoneStart) {
    return {
      text: "في الزون",
      cls: "zone",
    };
  }

  return {
    text: "آمن",
    cls: "safe",
  };
}

/* ===================================================== كروت اللاعبين ===================================================== */

function renderGame() {
  document.getElementById("roundTitle").textContent = "الجولة " + round;

  const undoBtn = document.getElementById("undoBtn");

  if (undoBtn) {
    undoBtn.style.display = lastAction ? "block" : "none";
  }

  const box = document.getElementById("gameCards");

  box.innerHTML = "";

  gamePlayers.forEach((player, gIndex) => {
    const status = playerStatus(player, gIndex);

    let cardClass = "game-card";

    const isSitting =
      !player.burned &&
      roundPlayers.length > 0 &&
      !roundPlayers.includes(gIndex);

    if (player.burned) {
      cardClass += " burned";
    } else if (isSitting) {
      cardClass += " sitting";
    } else if (player.total >= zoneStart) {
      cardClass += " zone";
    }

    const card = document.createElement("div");

    card.className = cardClass;

    let errorText = "";

    if (player.errors3 > 0) {
      errorText += "خطأ 3: " + player.errors3;
    }

    if (player.errors14 > 0) {
      if (errorText) {
        errorText += " • ";
      }

      errorText += "خطأ 14: " + player.errors14;
    }

    card.innerHTML = ` <div class="game-player-head"> ${ player.burned ? `<div class="avatar">🔥</div>` : avatarHTML(player.name) } <div class="game-name"> ${esc(player.name)} </div> <div class="status ${status.cls}"> ${status.text} </div> </div> <div class="stats"> <div class="stat"> <div class="stat-label"> النقاط </div> <div class="stat-value"> ${player.total} </div> </div> <div class="stat"> <div class="stat-label"> الفتوح </div> <div class="stat-value"> ${player.wins} </div> </div> <div class="stat"> <div class="stat-label"> الخمسين </div> <div class="stat-value"> ${player.fifties} </div> </div> </div> ${ player.roundTotal !== 0 ? `<div class="card-round"> هذه الجولة: ${player.roundTotal > 0 ? "+" : ""} ${player.roundTotal} </div>` : "" } ${ errorText ? `<div class="card-errors"> ${errorText} </div>` : "" } `;

    box.appendChild(card);
  });
}

/* ===================================================== إدخال النقاط ===================================================== */

function startPointsInput() {
  const index = findNextPlayer(-1);

  if (index === -1) {
    toast("تم إدخال نقاط جميع اللاعبين");

    return;
  }

  currentInputIndex = index;

  currentInputValue = "0";

  openCurrentInput();
}

function findNextPlayer(start) {
  for (let i = start + 1; i < gamePlayers.length; i++) {
    if (!gamePlayers[i].burned && currentRoundPoints[i] === null) {
      return i;
    }
  }

  return -1;
}

function openCurrentInput() {
  if (currentInputIndex === -1) {
    return;
  }

  const player = gamePlayers[currentInputIndex];

  const avatarBox = document.getElementById("inputAvatar");

  if (avatarBox) {
    avatarBox.style.background = getPlayerColor(player.name) + "22";
    avatarBox.style.color = getPlayerColor(player.name);
    avatarBox.textContent = (player.name.trim()[0] || "؟").toUpperCase();
  }

  document.getElementById("inputPlayerName").textContent = player.name;

  const active = gamePlayers.filter((p) => !p.burned).length;

  const position = gamePlayers
    .slice(0, currentInputIndex + 1)
    .filter((p) => !p.burned).length;

  document.getElementById("inputProgress").textContent =
    "اللاعب " + position + " من " + active;

  updatePointsDisplay();

  showScreen("pointsScreen");
}

function updatePointsDisplay() {
  document.getElementById("pointsDisplay").textContent = currentInputValue;
}

function keyInput(value) {
  if (currentInputValue === "-") {
    currentInputValue = "-" + value;
  } else if (currentInputValue === "0") {
    currentInputValue = value;
  } else {
    if (currentInputValue.replace("-", "").length < 3) {
      currentInputValue += value;
    }
  }

  updatePointsDisplay();
}

function keyMinus() {
  if (currentInputValue === "0") {
    currentInputValue = "-";
  } else if (!currentInputValue.startsWith("-")) {
    currentInputValue = "-" + currentInputValue;
  }

  updatePointsDisplay();
}

function keyClear() {
  if (currentInputValue.length <= 1 || currentInputValue === "0") {
    currentInputValue = "0";
  } else {
    currentInputValue = currentInputValue.slice(0, -1);
  }

  updatePointsDisplay();
}

function confirmPoints() {
  if (currentInputValue === "" || currentInputValue === "-") {
    toast("أدخل رقمًا صحيحًا");

    return;
  }

  vibrate(15);

  const value = Number(currentInputValue);

  const player = gamePlayers[currentInputIndex];

  lastAction = {
    type: "points",
    index: currentInputIndex,
    prevRoundTotal: player.roundTotal,
  };

  currentRoundPoints[currentInputIndex] = value;

  /* النقاط تُحفظ مؤقتًا فقط. لا تُضاف إلى المجموع النهائي إلا عند تأكيد الجولة. */

  player.roundTotal =
    currentRoundErrors[currentInputIndex].plus3 +
    currentRoundErrors[currentInputIndex].plus14 +
    value;

  renderGame();

  saveGameState();

  currentInputIndex = findNextPlayer(currentInputIndex);

  if (currentInputIndex === -1) {
    renderRoundConfirmation();

    showScreen("roundConfirmScreen");

    return;
  }

  currentInputValue = "0";

  openCurrentInput();
}

function cancelPointsInput() {
  showScreen("gameScreen");
}

/* ===================================================== تسجيل الأخطاء ===================================================== */

function openErrorSelector(amount) {
  currentErrorAmount = amount;

  document.getElementById("errorTitle").textContent = "تسجيل " + amount;

  document.getElementById("errorAmountText").textContent = "+" + amount;

  renderErrorPlayers();

  showScreen("errorScreen");
}

function renderErrorPlayers() {
  const box = document.getElementById("errorList");

  box.innerHTML = "";

  gamePlayers.forEach((player, index) => {
    if (player.burned) {
      return;
    }

    if (!roundPlayers.includes(index)) {
      return;
    }

    const btn = document.createElement("button");

    btn.className = "error-player";

    btn.innerHTML = ` ${avatarHTML(player.name)} <div style="flex:1"> ${esc(player.name)} </div> <div style=" color:#ff8a1f; font-weight:700"> +${currentErrorAmount} </div> `;

    btn.onclick = () => {
      registerError(index, currentErrorAmount);
    };

    box.appendChild(btn);
  });
}

function registerError(index, amount) {
  const player = gamePlayers[index];

  if (player.burned) {
    toast("هذا اللاعب حارق");

    return;
  }

  if (!roundPlayers.includes(index)) {
    toast("هذا اللاعب قاعد هذه الجولة");

    return;
  }

  lastAction = {
    type: "error",
    index: index,
    amount: amount,
    prevTotal: player.total,
    prevRoundTotal: player.roundTotal,
    prevErrors3: player.errors3,
    prevErrors14: player.errors14,
    prevRoundErrorPlus3: currentRoundErrors[index].plus3,
    prevRoundErrorPlus14: currentRoundErrors[index].plus14,
  };

  if (amount === 3) {
    player.errors3++;

    currentRoundErrors[index].plus3++;
  }

  if (amount === 14) {
    player.errors14++;

    currentRoundErrors[index].plus14++;
  }

  /* الخطأ يضاف فورًا للنقاط. لا يوجد حرق هنا. */

  player.total += amount;

  player.roundTotal += amount;

  renderGame();

  saveGameState();

  showScreen("gameScreen");

  toast("تم تسجيل " + amount + " للاعب " + player.name);
}

function undoLastAction() {
  if (!lastAction) {
    toast("لا يوجد إجراء للتراجع عنه");

    return;
  }

  vibrate(15);

  if (lastAction.type === "points") {
    const player = gamePlayers[lastAction.index];

    currentRoundPoints[lastAction.index] = null;

    player.roundTotal = lastAction.prevRoundTotal;

    currentInputIndex = lastAction.index;

    currentInputValue = "0";

    lastAction = null;

    renderGame();

    saveGameState();

    showScreen("pointsScreen");

    openCurrentInput();

    toast("تم التراجع عن آخر إدخال نقاط");
  } else if (lastAction.type === "error") {
    const player = gamePlayers[lastAction.index];

    player.total = lastAction.prevTotal;

    player.roundTotal = lastAction.prevRoundTotal;

    player.errors3 = lastAction.prevErrors3;

    player.errors14 = lastAction.prevErrors14;

    currentRoundErrors[lastAction.index].plus3 = lastAction.prevRoundErrorPlus3;

    currentRoundErrors[lastAction.index].plus14 =
      lastAction.prevRoundErrorPlus14;

    lastAction = null;

    renderGame();

    saveGameState();

    showScreen("gameScreen");

    toast("تم التراجع عن الخطأ");
  }
}

/* ===================================================== إنهاء الجولة ===================================================== */

function renderRoundConfirmation() {
  const list = document.getElementById("roundConfirmList");

  if (!list) {
    return;
  }

  list.innerHTML = gamePlayers
    .map((player, index) => {
      const points =
        currentRoundPoints[index] === null ? 0 : currentRoundPoints[index];

      const errors =
        currentRoundErrors[index].plus3 + currentRoundErrors[index].plus14;

      const roundTotal = points + errors;

      let extra = "";

      const isWin =
        (round === 1 && points === 0) || (round > 1 && points === -1);

      const isFifty =
        (round === 1 && points === -2) || (round > 1 && points === -3);

      if (isWin) {
        extra = "🏆 فتوح";
      } else if (isFifty) {
        extra = "🔥 خمسين";
      }

      return ` <div class="round-player"> <div class="round-player-name"> ${esc(player.name)} </div> <div class="round-player-score"> ${roundTotal > 0 ? "+" : ""} ${roundTotal} </div> ${ extra ? ` <div class="round-player-extra"> ${extra} </div> ` : "" } </div> `;
    })
    .join("");
}

function confirmRound() {
  finishRound();
}

function finishRound() {
  vibrate(20);

  lastAction = null;

  const hasError = currentRoundErrors.some((e) => e.plus3 > 0 || e.plus14 > 0);

  /* إذا لم يوجد خطأ: يجب إدخال نقاط جميع اللاعبين. */

  if (!hasError) {
    const missing = gamePlayers.some(
      (player, index) => !player.burned && currentRoundPoints[index] === null
    );

    if (missing) {
      toast("أدخل نقاط جميع اللاعبين أولًا");

      return;
    }
  }

  /* اعتماد نقاط الجولة. النقاط كانت معلقة حتى الآن. */

  gamePlayers.forEach((player, index) => {
    const value = currentRoundPoints[index];

    if (value === null || value === undefined) {
      return;
    }

    player.total += value;

    player.roundTotal += value;

    /* الجولة الأولى: 0 = فتوح -2 = خمسين باقي الجولات: -1 = فتوح -3 = خمسين */

    if ((round === 1 && value === 0) || (round > 1 && value === -1)) {
      player.wins++;
    }

    if ((round === 1 && value === -2) || (round > 1 && value === -3)) {
      player.fifties++;
    }
  });

  /* حفظ نسخة الجولة قبل بدء الجولة الجديدة. */

  const savedRound = {
    number: round,

    players: gamePlayers.map((player, index) => ({
      name: player.name,

      points:
        currentRoundPoints[index] === null ? 0 : currentRoundPoints[index],

      errors3: currentRoundErrors[index].plus3,

      errors14: currentRoundErrors[index].plus14,

      roundTotal: player.roundTotal,

      winsAdded:
        (round === 1 && currentRoundPoints[index] === 0) ||
        (round > 1 && currentRoundPoints[index] === -1)
          ? 1
          : 0,

      fiftiesAdded:
        (round === 1 && currentRoundPoints[index] === -2) ||
        (round > 1 && currentRoundPoints[index] === -3)
          ? 1
          : 0,
    })),
  };

  roundHistory.push(savedRound);

  /* الحرق يُحسم الآن فقط. */

  gamePlayers.forEach((player) => {
    if (player.burned) {
      return;
    }

    if (player.total >= firePoint) {
      player.burned = true;
    }
  });

  /* إذا لم يبقَ إلا لاعب واحد تنتهي العشرة. */

  const alive = gamePlayers.filter((p) => !p.burned);

  if (alive.length <= 1) {
    renderGame();

    clearGameState();

    setTimeout(() => {
      showEndTen();
    }, 250);

    return;
  }

  /* الجولة التالية. */

  round++;

  toast("تم إنهاء الجولة");

  beginRound();
}

/* ===================================================== نهاية العشرة ===================================================== */

function showEndTen() {
  const alive = gamePlayers.filter((p) => !p.burned);

  let winner = null;

  if (alive.length === 1) {
    winner = alive[0];
  } else if (alive.length > 1) {
    winner = [...alive].sort((a, b) => a.total - b.total)[0];
  }

  const winnerBox = document.getElementById("winnerCard");

  if (winner) {
    winnerBox.innerHTML = ` <div class="about-card"> <div class="about-logo"> 👑 </div> <div class="about-name"> ${esc(winner.name)} </div> <div class="about-version"> فائز </div> </div> `;
  } else {
    winnerBox.innerHTML = "";
  }

  const finalList = document.getElementById("finalList");

  finalList.innerHTML = "";

  const sorted = [...gamePlayers].sort((a, b) => {
    if (a.burned !== b.burned) {
      return a.burned ? 1 : -1;
    }

    return a.total - b.total;
  });

  sorted.forEach((player) => {
    const row = document.createElement("div");

    const isWinner = winner && player.name === winner.name && !player.burned;

    row.className =
      "final-row " + (player.burned ? "burned" : isWinner ? "winner" : "");

    row.innerHTML = ` ${ player.burned ? `<div class="avatar">🔥</div>` : isWinner ? `<div class="avatar">👑</div>` : avatarHTML(player.name) } <div class="final-name"> <div> ${esc(player.name)} </div> <div class="final-status"> ${player.burned ? "🔥 حارق" : isWinner ? "👑 فائز" : ""} </div> </div> <div class="final-score"> ${player.total} </div> `;

    finalList.appendChild(row);
  });

  showScreen("endTenScreen");
}

function shareTenResult() {
  const alive = gamePlayers.filter((p) => !p.burned);

  let winner = null;

  if (alive.length === 1) {
    winner = alive[0];
  } else if (alive.length > 1) {
    winner = [...alive].sort((a, b) => a.total - b.total)[0];
  }

  const sorted = [...gamePlayers].sort((a, b) => {
    if (a.burned !== b.burned) {
      return a.burned ? 1 : -1;
    }
    return a.total - b.total;
  });

  let text = "🔥 نتيجة عشرة حريق\n\n";

  if (winner) {
    text += "👑 الفائز: " + winner.name + "\n\n";
  }

  sorted.forEach((player) => {
    text +=
      (player.burned ? "🔥 " : "▫️ ") +
      player.name +
      " — " +
      player.total +
      "\n";
  });

  text += "\nدفتر حريق Premium";

  if (navigator.share) {
    navigator
      .share({
        title: "نتيجة عشرة حريق",
        text: text,
      })
      .catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast("تم نسخ النتيجة");
      })
      .catch(() => {
        toast("تعذّر نسخ النتيجة");
      });
  } else {
    toast("المشاركة غير مدعومة بهذا الجهاز");
  }
}

/* ===================================================== حفظ العشرة في السجل ===================================================== */

function saveTenAndHome() {
  const alive = gamePlayers.filter((p) => !p.burned);

  const winner = alive.length === 1 ? alive[0] : null;

  const record = {
    id: Date.now(),

    date: new Date().toISOString(),

    firePoint: firePoint,

    zoneStart: zoneStart,

    rounds: JSON.parse(JSON.stringify(roundHistory)),

    players: gamePlayers.map((player) => ({
      name: player.name,

      total: player.total,

      wins: player.wins,

      fifties: player.fifties,

      errors3: player.errors3,

      errors14: player.errors14,

      status:
        winner && player.name === winner.name && !player.burned
          ? "winner"
          : player.burned
          ? "burned"
          : "other",
    })),
  };

  history.unshift(record);

  saveHistory();

  clearGameState();

  renderHistory();

  renderHomeLastTen();

  renderResumeCard();

  toast("تم حفظ العشرة");

  setTimeout(() => {
    showScreen("homeScreen");
  }, 500);
}

function saveHistory() {
  localStorage.setItem(STORAGE.history, JSON.stringify(history));
}

/* ===================================================== سجل العشرات ===================================================== */

function getWinnerName(record) {
  const w = record.players.find((p) => p.status === "winner");

  return w ? w.name : null;
}

function winStreakAt(index) {
  const name = getWinnerName(history[index]);

  if (!name) {
    return 0;
  }

  let streak = 0;

  for (let i = index; i < history.length; i++) {
    if (getWinnerName(history[i]) === name) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function renderHistory() {
  const box = document.getElementById("historyList");

  if (!history.length) {
    box.innerHTML = ` <div class="empty"> 📋<br><br> لا توجد عشرات حتى الآن </div> `;

    return;
  }

  box.innerHTML = "";

  history.forEach((record, index) => {
    const item = document.createElement("button");

    item.className = "history-item";

    item.onclick = () => openHistory(index);

    const streak = winStreakAt(index);

    item.innerHTML = ` <div class="history-head"> <div class="avatar"> 📋 </div> <div class="history-info"> <div class="history-title"> العشرة ${history.length - index} ${ index === 0 ? `<span class="latest-badge">الأحدث</span>` : "" } </div> <div class="history-date"> ${formatDate(record.date)} ${streak >= 2 ? ` • 🔥 ${streak} فوز متتالي` : ""} </div> </div> <div class="arrow"> ‹ </div> </div> <div class="history-players"> ${record.players.map((p) => esc(p.name)).join(" • ")} </div> `;

    box.appendChild(item);
  });
}

function openHistory(index) {
  currentHistoryIndex = index;

  const record = history[index];

  const box = document.getElementById("historyDetail");

  const winner = record.players.find((p) => p.status === "winner");

  box.innerHTML = ` <div class="detail-info"> <div class="detail-box"> <div class="detail-label"> التاريخ </div> <div class="detail-value"> ${formatDate(record.date)} </div> </div> <div class="detail-box"> <div class="detail-label"> نقطة الحريق </div> <div class="detail-value"> ${record.firePoint} </div> </div> <div class="detail-box"> <div class="detail-label"> عدد الجولات </div> <div class="detail-value"> ${record.rounds.length} </div> </div> <div class="detail-box"> <div class="detail-label"> الفائز </div> <div class="detail-value"> ${winner ? esc(winner.name) : "—"} </div> </div> </div> <div class="section-title"> اللاعبون </div> <div class="final-list"> ${record.players .map( (player) => ` <div class="final-row ${ player.status === "winner" ? "winner" : player.status === "burned" ? "burned" : "" }"> ${ player.status === "winner" ? `<div class="avatar">👑</div>` : player.status === "burned" ? `<div class="avatar">🔥</div>` : avatarHTML(player.name) } <div class="final-name"> <div> ${esc(player.name)} </div> <div class="final-status"> ${ player.status === "winner" ? "👑 فائز" : player.status === "burned" ? "🔥 حارق" : "" } </div> </div> <div class="final-score"> ${player.total} </div> </div> ` ) .join("")} </div> <div class="section-title"> الجولات </div> ${ record.rounds.length ? record.rounds .map( (roundData) => ` <div class="round-detail"> <div class="round-detail-title"> الجولة ${roundData.number} </div> ${roundData.players .map( (p) => ` <div class="round-player"> <div class="round-player-name"> <div> ${esc(p.name)} </div> <div class="round-player-extra"> ${p.winsAdded ? "فتوح +1" : ""} ${p.fiftiesAdded ? "خمسين +1" : ""} ${ p.errors3 ? (p.winsAdded || p.fiftiesAdded ? " • " : "") + "خطأ 3 × " + p.errors3 : "" } ${ p.errors14 ? " • خطأ 14 × " + p.errors14 : "" } </div> </div> <div class="round-player-score"> ${p.points > 0 ? "+" : ""} ${p.points} </div> </div> ` ) .join("")} </div> ` ) .join("") : `<div class="empty"> لا توجد تفاصيل جولات </div>` } <button class="outline-btn" style="color:#C94A45;border-color:#EBC1BE" onclick="deleteHistory(${index})"> حذف هذه العشرة </button> `;

  showScreen("historyDetailScreen");
}

function deleteHistory(index) {
  if (!confirm("هل تريد حذف هذه العشرة من السجل؟")) {
    return;
  }

  history.splice(index, 1);

  saveHistory();

  renderHistory();

  renderHomeLastTen();

  showScreen("historyScreen");
}

/* ===================================================== مكتبة اللاعبين ===================================================== */

function openLibrary() {
  renderLibrary();

  showScreen("libraryScreen");
}

function renderLibrary() {
  const box = document.getElementById("libraryList");

  if (!players.length) {
    box.innerHTML = ` <div class="empty"> 👥<br><br> لا يوجد لاعبون في المكتبة </div> `;

    return;
  }

  box.innerHTML = "";

  players.forEach((name, index) => {
    const item = document.createElement("div");

    item.className = "library-item";

    item.innerHTML = ` ${avatarHTML(name)} <div class="library-name"> ${esc(name)} </div> <button class="icon-btn" onclick="editLibraryPlayer(${index})"> ✏️ </button> <button class="icon-btn delete" onclick="deleteLibraryPlayer(${index})"> 🗑️ </button> `;

    box.appendChild(item);
  });
}

/* ===================================================== إحصائيات اللاعبين ===================================================== */

function computePlayerStats() {
  const map = {};

  history.forEach((record) => {
    record.players.forEach((p) => {
      if (!map[p.name]) {
        map[p.name] = {
          name: p.name,
          played: 0,
          wins: 0,
          burns: 0,
          totalSum: 0,
        };
      }

      const s = map[p.name];

      s.played++;

      s.totalSum += p.total;

      if (p.status === "winner") {
        s.wins++;
      }

      if (p.status === "burned") {
        s.burns++;
      }
    });
  });

  return Object.values(map)
    .map((s) => ({
      ...s,
      avg: s.played ? Math.round(s.totalSum / s.played) : 0,
    }))
    .sort((a, b) => b.wins - a.wins);
}

function openStats() {
  renderStats();

  showScreen("statsScreen");
}

function renderStats() {
  const box = document.getElementById("statsList");

  const stats = computePlayerStats();

  if (!stats.length) {
    box.innerHTML = ` <div class="empty"> 📈<br><br> لا توجد بيانات كافية بعد </div> `;

    return;
  }

  box.innerHTML = "";

  stats.forEach((s) => {
    const item = document.createElement("div");

    item.className = "library-item stats-item";

    item.innerHTML = ` ${avatarHTML(s.name)} <div class="library-name"> <div>${esc(s.name)}</div> <div class="stats-line"> 🎮 ${s.played} &nbsp;•&nbsp; 👑 ${s.wins} &nbsp;•&nbsp; 🔥 ${s.burns} &nbsp;•&nbsp; ⌀ ${s.avg} </div> </div> `;

    box.appendChild(item);
  });
}

function openLibraryPlayer() {
  document.getElementById("libraryPlayerName").value = "";

  document.getElementById("libraryPlayerModal").classList.add("show");
}

function saveLibraryPlayer() {
  const name = document.getElementById("libraryPlayerName").value.trim();

  if (!name) {
    toast("اكتب اسم اللاعب");

    return;
  }

  if (players.includes(name)) {
    toast("هذا اللاعب موجود بالفعل");

    return;
  }

  players.push(name);

  savePlayers();

  renderLibrary();

  closeModal("libraryPlayerModal");

  toast("تم حفظ اللاعب");
}

function editLibraryPlayer(index) {
  const oldName = players[index];

  const value = prompt("تعديل اسم اللاعب", oldName);

  if (value === null) {
    return;
  }

  const name = value.trim();

  if (!name) {
    return;
  }

  if (players.includes(name) && name !== oldName) {
    toast("هذا الاسم موجود بالفعل");

    return;
  }

  players[index] = name;

  savePlayers();

  renderLibrary();
}

function deleteLibraryPlayer(index) {
  if (!confirm("هل تريد حذف اللاعب من المكتبة؟")) {
    return;
  }

  players.splice(index, 1);

  savePlayers();

  renderLibrary();
}

function savePlayers() {
  localStorage.setItem(STORAGE.players, JSON.stringify(players));
}

/* ===================================================== قواعد اللعب ===================================================== */

function openRulesSettings() {
  updateRuleScreen();

  showScreen("rulesScreen");
}

function updateRuleScreen() {
  document.getElementById("defaultFireValue").textContent = Number(
    settings.firePoint || 31
  );

  document.getElementById("zoneValue").textContent = Number(
    settings.zoneStart || 17
  );
}

function changeDefaultFire(value) {
  let v = Number(settings.firePoint || 31);

  v += value;

  if (v < 1) {
    v = 1;
  }

  if (v > 999) {
    v = 999;
  }

  settings.firePoint = v;

  updateRuleScreen();
}

function changeZone(value) {
  vibrate(12);

  let v = Number(settings.zoneStart || 17);

  v += value;

  if (v < 1) {
    v = 1;
  }

  if (v >= Number(settings.firePoint || 31)) {
    v = Number(settings.firePoint || 31) - 1;
  }

  settings.zoneStart = v;

  updateRuleScreen();
}

function saveRules() {
  localStorage.setItem(STORAGE.settings, JSON.stringify(settings));

  firePoint = Number(settings.firePoint || 31);

  zoneStart = Number(settings.zoneStart || 17);

  toast("تم حفظ القواعد");
}

/* ===================================================== النسخ الاحتياطي ===================================================== */

function openBackup() {
  showScreen("backupScreen");
}

function exportData() {
  const data = {
    app: "Hareeg Premium",

    version: "1.0",

    exportedAt: new Date().toISOString(),

    players: players,

    history: history,

    settings: settings,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;

  a.download =
    "hareeg-backup-" + new Date().toISOString().slice(0, 10) + ".json";

  document.body.appendChild(a);

  a.click();

  a.remove();

  URL.revokeObjectURL(url);

  toast("تم إنشاء النسخة الاحتياطية");
}

function importData(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = function () {
    try {
      const data = JSON.parse(reader.result);

      if (
        !data ||
        !Array.isArray(data.players) ||
        !Array.isArray(data.history)
      ) {
        throw new Error();
      }

      players = data.players;

      history = data.history;

      settings = data.settings || {};

      localStorage.setItem(STORAGE.players, JSON.stringify(players));

      localStorage.setItem(STORAGE.history, JSON.stringify(history));

      localStorage.setItem(STORAGE.settings, JSON.stringify(settings));

      firePoint = Number(settings.firePoint || 31);

      zoneStart = Number(settings.zoneStart || 17);

      renderLibrary();

      renderHistory();

      renderHomeLastTen();

      updateRuleScreen();

      toast("تمت استعادة البيانات");
    } catch (error) {
      toast("ملف النسخة الاحتياطية غير صالح");
    }
  };

  reader.readAsText(file);

  event.target.value = "";
}

function deleteAllHistory() {
  if (!history.length) {
    toast("السجل فارغ");

    return;
  }

  if (!confirm("سيتم حذف جميع العشرات. هل أنت متأكد؟")) {
    return;
  }

  history = [];

  saveHistory();

  renderHistory();

  renderHomeLastTen();

  toast("تم حذف جميع العشرات");
}

/* ===================================================== الاقتراحات والمشاكل ===================================================== */

function openFeedback(type) {
  feedbackType = type;

  document.getElementById("feedbackTitle").textContent =
    type === "suggestion" ? "إرسال اقتراح" : "الإبلاغ عن مشكلة";

  document.getElementById("feedbackText").value = "";

  document.getElementById("feedbackModal").classList.add("show");
}

function submitFeedback() {
  const text = document.getElementById("feedbackText").value.trim();

  if (!text) {
    toast("اكتب رسالتك أولًا");

    return;
  }

  /* في هذه النسخة تحفظ الرسالة محليًا. سيتم ربطها بوسيلة التواصل الخاصة بالمؤسس عندما تحدد الرابط لاحقًا. */

  const key = "hareeg_feedback";

  const list = JSON.parse(localStorage.getItem(key) || "[]");

  list.push({
    type: feedbackType,

    text: text,

    date: new Date().toISOString(),
  });

  localStorage.setItem(key, JSON.stringify(list));

  closeModal("feedbackModal");

  toast(feedbackType === "suggestion" ? "تم حفظ الاقتراح" : "تم حفظ البلاغ");
}

/* ===================================================== النوافذ ===================================================== */

function closeModal(id) {
  const modal = document.getElementById(id);

  if (modal) {
    modal.classList.remove("show");
  }
}

/* ===================================================== Toast ===================================================== */

function toast(message) {
  const box = document.getElementById("toast");

  box.textContent = message;

  box.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    box.classList.remove("show");
  }, 2200);
}

/* ===================================================== أدوات ===================================================== */

function formatDate(date) {
  return new Date(date).toLocaleString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
