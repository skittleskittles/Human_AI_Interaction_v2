import { globalState } from "./data/variable.js";

const MAX_TIMER_INTERVAL = 1200;

export const timerManager = {
  timers: {
    global: { seconds: MAX_TIMER_INTERVAL, interval: null },
    trial: { seconds: 0, interval: null },
    submission: { seconds: 0, interval: null },
  },
};

export function startTimer(mode) {
  const timer = timerManager.timers[mode];
  if (!timer || timer.interval) return;

  timer.interval = setInterval(() => {
    // "global" counts down regardless of visibility
    if (mode === "global") {
      if (timer.seconds <= 0) {
        clearInterval(timer.interval);
        timer.interval = null;
        document.getElementById("timer").textContent = "00:00";
        handleTimeOut();
        return;
      }

      // todo fsy: 10 min: trigger attention check
      if (timer.seconds === 1190 && !globalState.attentionCheckShown) {
        globalState.attentionCheckPending = true;
      }

      timer.seconds--;
      const min = String(Math.floor(timer.seconds / 60)).padStart(2, "0");
      const sec = String(timer.seconds % 60).padStart(2, "0");
      document.getElementById("timer").textContent = `${min}:${sec}`;
    } else {
      // For trial/submission, only count if tab is visible
      if (document.visibilityState === "visible") {
        timer.seconds++;
      }
    }
  }, 1000);
}

export function pauseTimer(mode) {
  const timer = timerManager.timers[mode];
  if (timer?.interval) {
    clearInterval(timer.interval);
    timer.interval = null;
  }
}

export function resumeTimer(mode) {
  const timer = timerManager.timers[mode];
  if (!timer || timer.interval) return; // Already running or invalid mode

  // Reuse logic from startTimer
  startTimer(mode);
}

export function resetTimer(mode, value = 0) {
  const timer = timerManager.timers[mode];
  if (timer) timer.seconds = value;
}

export function getTimerValue(mode) {
  return timerManager.timers[mode]?.seconds ?? 0;
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

  // todo fsy: update db (set is finished)
}
