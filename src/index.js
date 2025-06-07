import { gameContainer } from "./data/domElements.js";
import {
  getObjCount,
  setObjCount,
  setQuestionsData,
  shouldShowComprehensionCheck,
} from "./data/variable.js";
import { User } from "./collectData.js";
import { loadModal } from "./modal.js";
import { nextTrial, bindTrialButtons } from "./trialAction.js";
import Papa from "papaparse";
import { getCurDate, getUrlParameters, generateUID } from "./utils.js";
import {
  checkIfUserExists,
  saveOrUpdateUser,
} from "./firebase/saveData2Firebase.js";
import { showLoading, hideLoading } from "./uiState.js";
import { showConsent } from "./consent.js";
import {
  showEnterComprehensionTrialsPopUp,
  showMultipleAttemptsPopUp,
} from "./modal.js";

async function initExperimentEnvironment() {
  try {
    // 1. Parse URL parameters
    const urlParams = getUrlParameters();

    // 2. Set object count based on `v=zeta`
    if (urlParams.v !== undefined && urlParams.v === "zeta") {
      setObjCount(6);
      User.num_objects = 6;
    } else {
      setObjCount(5);
      User.num_objects = 5;
    }

    // 3. Set Prolific ID (default to random if missing)
    User.prolific_pid = urlParams.PROLIFIC_PID || generateUID();

    // 4. Choose file after objCount set
    const csvFile =
      getObjCount() === 6
        ? "six_objects_instructions.csv"
        : "five_objects_simple.csv";

    // 5. Load CSV data via Papa.parse
    Papa.parse(csvFile, {
      download: true,
      header: true,
      complete: async function (results) {
        const rawData = results.data;
        const parsedData = rawData.map((row) => {
          const answer = row["Correct Order"].split(",").map((s) => s.trim());
          const options = [...answer].sort();

          const numStatements = parseInt(row["Num Statements"], 10);
          const statements = [];
          for (let i = 1; i <= numStatements; i++) {
            const statement = row[`Statement ${i}`]?.trim();
            if (statement) statements.push(statement);
          }

          let front_end = ["front", "end"];
          if (row["front_end"]) {
            front_end = row["front_end"]
              .replace(/^\s*["']?|["']?\s*$/g, "")
              .split(",")
              .map((s) => s.trim());
          }

          let instruction = row["instruction"];
          let style = [];
          if (row["style"]) {
            try {
              style = JSON.parse(row["style"].replace(/'/g, '"'));
            } catch (e) {
              console.warn("Failed to parse style:", row["style"]);
              style = Array(answer.length).fill("blank");
            }
          }

          const styleMap = {};
          answer.forEach((name, i) => {
            styleMap[name] = style[i] || "blank";
          });
          const sortedStyle = options.map((name) => styleMap[name]);

          return {
            answer,
            options,
            instruction,
            style: sortedStyle,
            statements,
            front_end,
          };
        });

        setQuestionsData(parsedData);
        bindTrialButtons();
        await loadModal(); // Make sure modal loads before experiment
        await startExperiment(false, false);
      },
    });
  } catch (error) {
    console.error("❌ Failed to initialize environment:", error);
  }
}

async function startExperiment(skipConsent = false, skipComprehension = false) {
  try {
    /***
     * Check Multiple Users
     */
    showLoading();

    const userExists = await checkIfUserExists(User.prolific_pid);

    if (userExists) {
      // multiple attempts, not allowed
      showMultipleAttemptsPopUp();
      hideLoading();
      return;
    }

    User.create_time = getCurDate();
    const { saveOrUpdateUser } = await import(
      "./firebase/saveData2Firebase.js"
    );
    await saveOrUpdateUser(getCurDate());

    hideLoading();

    if (!skipConsent) {
      showConsent();
      return;
    }

    if (!skipComprehension) {
      shouldShowComprehensionCheck();
      showEnterComprehensionTrialsPopUp();
    }
    gameContainer.style.display = "flex";
    startGame();
  } catch (error) {
    console.error("❌ Failed to start experiment:", error);
  }
}

export function startGame() {
  nextTrial();
}

initExperimentEnvironment();
