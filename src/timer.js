import { state } from "./constant.js";

export function startTimer() {
  state.interval = setInterval(() => {
    if (state.timer <= 0) {
      clearInterval(state.interval);
      document.getElementById("timer").textContent = "00:00";
      handleTimeOut();
      return;
    }
    state.timer--;
    const min = String(Math.floor(state.timer / 60)).padStart(2, "0");
    const sec = String(state.timer % 60).padStart(2, "0");
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
