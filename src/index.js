import { startTimer } from "./timer.js";
import { setRounds, nextTrial, bindTrialButtons } from "./trialAction.js";

fetch("questions.json")
  .then((res) => res.json())
  .then((data) => {
    setRounds(data);
    bindTrialButtons();
    nextTrial();
    startTimer();
  });
