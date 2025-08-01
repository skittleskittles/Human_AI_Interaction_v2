import {
    attentionCheckShown,
    enableAttentionCheckPending,
    getCurPhase,
    getNoAIPhaseTrialsLimit,
    getPhaseCurTrialIndex,
    PHASE_NAME,
    setPhaseTimerEnded,
} from "./data/variable.js";
import {showNeedMoreTrialsPopUp} from "./modal.js";

const PHASE1_DURATION = 8 * 60 * 1000; // ms
const PHASE2_DURATION = 20 * 60 * 1000; // ms
const PHASE3_DURATION = 8 * 60 * 1000; // ms

// todo fsy
// const PHASE1_DURATION = 5;
// const PHASE2_DURATION = 10;
// const PHASE3_DURATION = 10;

// todo fsy: NO AI version
export const timerManager = {
    timers: {
        phase1: {millisecond: PHASE1_DURATION, interval: null},
        phase2: {millisecond: PHASE2_DURATION, interval: null},
        phase3: {millisecond: PHASE3_DURATION, interval: null},
        trial: {millisecond: 0, interval: null},
        submission: {millisecond: 0, interval: null},
        trial_total: {millisecond: 0, interval: null}, // 包括离开屏幕的时间
    },
};

export function startTimer(mode) {
    const timer = timerManager.timers[mode];
    if (!timer || timer.interval) return;

    let lastUpdateTime = Date.now();

    timer.interval = setInterval(() => {
        const now = Date.now();
        const elapsedSec = now - lastUpdateTime;

        if (elapsedSec >= 1) {
            lastUpdateTime = now;

            // Phase 1/2/3 countdown
            if (
                [PHASE_NAME.PHASE1, PHASE_NAME.PHASE2, PHASE_NAME.PHASE3].includes(mode)
            ) {
                timer.millisecond -= elapsedSec;

                if (timer.millisecond <= 0) {
                    timer.millisecond = 0;
                }

                // Update UI
                const totalSeconds = Math.floor(timer.millisecond / 1000);
                const min = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
                const sec = String(totalSeconds % 60).padStart(2, "0");
                document.getElementById("timer").textContent = `${min}:${sec}`;

                if (timer.millisecond === 0) {
                    clearInterval(timer.interval);
                    timer.interval = null;

                    setPhaseTimerEnded(true);
                    if (
                        [PHASE_NAME.PHASE1, PHASE_NAME.PHASE3].includes(getCurPhase()) &&
                        getPhaseCurTrialIndex() < getNoAIPhaseTrialsLimit()
                    ) {
                        showNeedMoreTrialsPopUp();
                    }

                    return;
                }

                // attention check logic
                if (
                    mode === PHASE_NAME.PHASE2 &&
                    timer.millisecond <= 10 * 60 * 1000 &&
                    !attentionCheckShown()
                ) {
                    enableAttentionCheckPending();
                }
            }

            // Accumulative timers (e.g. trial, submission)
            else if (mode === "trial_total") {
                timer.millisecond += elapsedSec;
            } else if (
                ["trial", "submission"].includes(mode) &&
                document.visibilityState === "visible"
            ) {
                timer.millisecond += elapsedSec;
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
    if (timer) timer.millisecond = value;
}

export function restartTimer(mode, value = 0) {
    pauseTimer(mode);
    resetTimer(mode, value);
    startTimer(mode);
}

export function getTimerValue(mode) {
    return timerManager.timers[mode]?.millisecond ?? 0;
}
