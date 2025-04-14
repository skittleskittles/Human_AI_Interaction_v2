let timer = 600;
let interval;
let steps = 0;
let currentRound = -1;
let rounds = [];

function startTimer() {
  interval = setInterval(() => {
    if (timer <= 0) {
      clearInterval(interval);
      document.getElementById("timer").textContent = "00:00";
      return;
    }
    timer--;
    const min = String(Math.floor(timer / 60)).padStart(2, "0");
    const sec = String(timer % 60).padStart(2, "0");
    document.getElementById("timer").textContent = `${min}:${sec}`;
  }, 1000);
}

function checkAllBoxesFilled() {
  const boxes = document.querySelectorAll(".box");
  const allFilled = Array.from(boxes).every((box) => box.children.length > 0);
  document.getElementById("submit-btn").disabled = !allFilled;
}

window.allowDrop = function (ev) {
  ev.preventDefault();
};

window.drag = function (ev) {
  ev.dataTransfer.setData("text", ev.target.id);
};

window.drop = function (ev) {
  ev.preventDefault();
  const data = ev.dataTransfer.getData("text");
  const draggedEl = document.getElementById(data);
  if (ev.target.classList.contains("box") && ev.target.children.length === 0) {
    ev.target.appendChild(draggedEl);
    steps++;
    document.getElementById("steps").textContent = steps;
    checkAllBoxesFilled();
  }
};

window.submitTrial = function () {
  const boxes = document.querySelectorAll(".box");
  const userAns = Array.from(boxes).map((box) =>
    box.children.length ? box.children[0].id : null
  );
  const current = rounds[currentRound];
  let correctCount = 0;
  current.answer.forEach((c, i) => {
    if (userAns[i] === c) correctCount++;
  });
  const accuracy = Math.round((correctCount / current.answer.length) * 100);
  document.getElementById("accuracy").textContent = `${accuracy}%`;
  steps++;
  document.getElementById("steps").textContent = steps;

  document.getElementById("submit-btn").disabled = true;
  document.getElementById("next-btn").disabled = false;
};

window.nextTrial = function () {
  currentRound++;
  if (currentRound >= rounds.length) {
    alert("All trials completed!");
    return;
  }
  const current = rounds[currentRound];

  const dropZone = document.getElementById("dropZone");
  dropZone.innerHTML = "";
  current.answer.forEach(() => {
    const box = document.createElement("div");
    box.className = "box";
    box.setAttribute("ondrop", "drop(event)");
    box.setAttribute("ondragover", "allowDrop(event)");
    dropZone.appendChild(box);
  });

  const container = document.getElementById("option-container");
  container.innerHTML = current.people
    .map(
      (id) =>
        `<div class="option" draggable="true" id="${id}" ondragstart="drag(event)">${id}</div>`
    )
    .join("");

  const statementBox = document.querySelector("#statement-box ul");
  statementBox.innerHTML = current.statements
    .map((s) => `<li>${s}</li>`)
    .join("");

  document.getElementById("accuracy").textContent = "--";
  steps = 0;
  document.getElementById("steps").textContent = steps;
  document.getElementById("submit-btn").disabled = true;
  document.getElementById("next-btn").disabled = true;
};

// Load from questions.json and start
fetch("questions.json")
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    return res.json();
  })
  .then((data) => {
    rounds = data;
    nextTrial();
    startTimer();
  });
