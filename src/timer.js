import {
  PHASE_NAME,
  attentionCheckShown,
  enableAttentionCheckPending,
  getCurPhase,
  getNoAIPhaseTrialsLimit,
  getPhaseCurTrialIndex,
  setPhaseTimerEnded,
} from "./data/variable.js";
import { showNeedMoreTrialsPopUp } from "./modal.js";

// const PHASE1_DURATION = 8 * 60;
// const PHASE2_DURATION = 20 * 60;
// const PHASE3_DURATION = 8 * 60;

// todo fsy
const PHASE1_DURATION = 10;
const PHASE2_DURATION = 20;
const PHASE3_DURATION = 10;

// todo fsy: NO AI version
export const timerManager = {
  timers: {
    phase1: { seconds: PHASE1_DURATION, interval: null },
    phase2: { seconds: PHASE2_DURATION, interval: null },
    phase3: { seconds: PHASE3_DURATION, interval: null },
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

      // Phase 1/2/3 countdown
      if (
        [PHASE_NAME.PHASE1, PHASE_NAME.PHASE2, PHASE_NAME.PHASE3].includes(mode)
      ) {
        timer.seconds -= elapsedSec;

        if (timer.seconds <= 0) {
          timer.seconds = 0;
          clearInterval(timer.interval);
          timer.interval = null;

          setPhaseTimerEnded(true);
          // NoAI Phase
          if (
            [PHASE_NAME.PHASE1, PHASE_NAME.PHASE3].includes(getCurPhase()) &&
            getPhaseCurTrialIndex() < getNoAIPhaseTrialsLimit()
          ) {
            showNeedMoreTrialsPopUp();
          }

          return;
        }

        // attention check count down: 600 // todo fsy
        if (
          mode == PHASE_NAME.PHASE2 &&
          timer.seconds <= 600 &&
          !attentionCheckShown()
        ) {
          enableAttentionCheckPending();
        }

        // update UI
        const min = String(Math.floor(timer.seconds / 60)).padStart(2, "0");
        const sec = String(timer.seconds % 60).padStart(2, "0");
        document.getElementById("timer").textContent = `${min}:${sec}`;
      }

      // Accumulative timers (e.g. trial, submission)
      else if (document.visibilityState === "visible") {
        timer.seconds += elapsedSec;
      }
    }
  }, 500);
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
