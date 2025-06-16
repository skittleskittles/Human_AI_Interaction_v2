import { globalState, getPerformance } from "./data/variable.js";
import { disableDrag } from "./dragDrop.js";
import { showEndTimePopUp } from "./modal.js";
import { User } from "./collectData.js";
import { dbRecordTrial } from "./trialAction.js";
import { getCurExperimentData } from "./collectData.js";

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

  let lastUpdateTime = Date.now();

  timer.interval = setInterval(() => {
    const now = Date.now();
    const elapsedSec = Math.floor((now - lastUpdateTime) / 1000);

    if (elapsedSec >= 1) {
      lastUpdateTime = now;

      if (mode === "global") {
        timer.seconds -= elapsedSec;

        if (timer.seconds <= 0) {
          clearInterval(timer.interval);
          timer.interval = null;
          document.getElementById("timer").textContent = "00:00";
          handleTimeOut();
          return;
        }

        // attention check count down: 600
        if (timer.seconds == 600 && !globalState.attentionCheckShown) {
          globalState.attentionCheckPending = true;
        }

        const min = String(Math.floor(timer.seconds / 60)).padStart(2, "0");
        const sec = String(timer.seconds % 60).padStart(2, "0");
        document.getElementById("timer").textContent = `${min}:${sec}`;
      } else if (document.visibilityState === "visible") {
        timer.seconds += elapsedSec;
      }
    }
  }, 500); // Check frequently for better accuracy
}

export function pauseTimer(mode) {
  const timer = timerManager.timers[mode];
  if (timer?.interval) {
    clearInterval(timer.interval);
    timer.interval = null;
  }
}

export function clearAllTimers() {
  Object.keys(timerManager.timers).forEach((mode) => pauseTimer(mode));
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

export function restartTimer(mode, value = 0) {
  pauseTimer(mode);
  resetTimer(mode, value);
  startTimer(mode);
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
  disableDrag();

  // end game and show feedback page
  showEndTimePopUp();

  pauseTimer("submission");
  pauseTimer("trial");

  // update db
  const curExperiment = getCurExperimentData();
  curExperiment.is_finished = true;
  User.is_passed_all_experiments = User.is_passed_attention_check;

  const performance = JSON.parse(JSON.stringify(getPerformance()));
  const trialTimeSec = getTimerValue("trial");

  dbRecordTrial(performance, [], 0, trialTimeSec, false);
}
