import { globalState } from "./data/variable.js";

export function startTimer() {
  globalState.interval = setInterval(() => {
    if (globalState.timer <= 0) {
      clearInterval(globalState.interval);
      document.getElementById("timer").textContent = "00:00";
      handleTimeOut();
      return;
    }
    globalState.timer--;
    const min = String(Math.floor(globalState.timer / 60)).padStart(2, "0");
    const sec = String(globalState.timer % 60).padStart(2, "0");
    document.getElementById("timer").textContent = `${min}:${sec}`;
  }, 1000);
}

function handleTimeOut() {
  // disbale all buttons
  document.getElementById("submit-btn").disabled = true;
  document.getElementById("reset-btn").disabled = true;
  document.getElementById("next-btn").disabled = true;

  // disable drag
  document.querySelectorAll(".option").forEach((el) => {
    el.setAttribute("draggable", "false");
    el.style.cursor = "not-allowed";
  });
  document.querySelectorAll(".box").forEach((box) => {
    box.removeEventListener("dragover", preventDefaultDragOver);
    box.removeEventListener("drop", handleDrop);
  });

  alert("Time is up! Submissions are now closed.");

  //   setTimeout(() => {
  //     window.location.href = "xxx";
  //   }, 5000);
}
