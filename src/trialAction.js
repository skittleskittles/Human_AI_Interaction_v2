import {
  incrementSteps,
  resetSteps,
  remainingSubmissions,
  decrementSubmissions,
  resetSubmissions,
} from "./constant.js";
import {
  updateButtonStates,
  showResultContent,
  hideResultContent,
} from "./uiState.js";
import { bindDragDropEvents } from "./dragDrop.js";
import { getUserAnswer, evaluateAnswer } from "./utils.js";

let rounds = [];
let currentRound = -1;

export function setRounds(data) {
  rounds = data;
}

export function bindTrialButtons() {
  document.getElementById("submit-btn").addEventListener("click", submitTrial);
  document.getElementById("reset-btn").addEventListener("click", resetTrial);
  document.getElementById("next-btn").addEventListener("click", nextTrial);
}

/*
 ********************************************
 * Submit Trial
 ********************************************
 */
function submitTrial() {
  if (remainingSubmissions() <= 0) return;

  const userAns = getUserAnswer();
  const current = rounds[currentRound];
  const { correctCount, accuracy } = evaluateAnswer(userAns, current.answer);
  updateAfterSubmission(correctCount, accuracy);
}

function updateAfterSubmission(correctCount, accuracy) {
  showResultContent(correctCount, accuracy);
  incrementSteps();
  decrementSubmissions();
  updateRemainingSubmissionInfo();
  updateButtonStates({ forceEnableNext: true });
}

function updateRemainingSubmissionInfo() {
  const count = document.getElementById("submission-count");
  if (count) count.textContent = remainingSubmissions();
}

/*
 ********************************************
 * Reset Trial
 ********************************************
 */
function resetTrial() {
  const current = rounds[currentRound];
  clearBoxes();
  renderOptions(current.people);
  initializeAfterReset();
}

function clearBoxes() {
  document.querySelectorAll(".box").forEach((box) => (box.innerHTML = ""));
}

function renderOptions(people) {
  const container = document.getElementById("option-container");
  container.innerHTML = people
    .map((id) => `<div class="option" draggable="true" id="${id}">${id}</div>`)
    .join("");
  bindDragDropEvents();
}

function initializeAfterReset() {
  incrementSteps();
  updateButtonStates();
}

/*
 ********************************************
 * Next Trial
 ********************************************
 */
export function nextTrial() {
  if (!advanceRound()) return;
  const current = rounds[currentRound];

  renderBoxes(current.answer.length);
  renderOptions(current.people);
  renderStatements(current.statements);
  updateSideLabels(current.statements);
  initializeAfterNextRound();
}

function advanceRound() {
  currentRound++;
  if (currentRound >= rounds.length) {
    alert("All trials completed!");
    return false;
  }
  return true;
}

function renderBoxes(count) {
  /* label row */
  const labelRow = document.querySelector(".label-row");
  labelRow.innerHTML = "";
  for (let i = 1; i <= count; i++) {
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = i;
    labelRow.appendChild(label);
  }

  /* box row */
  const container = document.getElementById("box-container");
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const box = document.createElement("div");
    box.className = "box";
    container.appendChild(box);
  }

  bindDragDropEvents();
}

function renderStatements(statements) {
  const list = document.querySelector("#statement-box ul");
  list.innerHTML = statements.map((s) => `<li>${s}</li>`).join("");
}

function updateSideLabels(statements) {
  const leftLabel = document.getElementById("left-label");
  const rightLabel = document.getElementById("right-label");

  const isHeight = statements.some(
    (s) => s.includes("shorter") || s.includes("taller")
  );
  const isAge = statements.some(
    (s) => s.includes("younger") || s.includes("older")
  );

  if (isHeight) {
    leftLabel.textContent = "short";
    rightLabel.textContent = "tall";
  } else if (isAge) {
    leftLabel.textContent = "young";
    rightLabel.textContent = "old";
  } else {
    leftLabel.textContent = "front";
    rightLabel.textContent = "end";
  }
}

function initializeAfterNextRound() {
  hideResultContent();
  resetSteps();
  resetSubmissions();
  updateRemainingSubmissionInfo();
  updateButtonStates();
}
