import { gameContainer } from "./data/domElements.js";
import {
  getObjCount,
  setObjCount,
  shouldShowComprehensionCheck,
  setAIRevealCounts,
  phaseState,
  setAIHelpType,
  AI_HELP_TYPE,
  getShuffleMaxId,
  isNoAIExpGroup,
  setQuestionsData,
} from "./data/variable.js";
import { User } from "./collectData.js";
import { loadModal } from "./modal.js";
import { nextTrial, bindTrialButtons } from "./trialAction.js";
import Papa from "papaparse";
import { getUrlParameters, generateUID, shuffleArray } from "./utils.js";
import { saveOrUpdateUser } from "./firebase/saveData2Firebase.js";
import { showConsent } from "./consent.js";
import { showEnterComprehensionTrialsPopUp } from "./modal.js";
import { checkUserParticipation } from "./checkUserStatus.js";

async function initExperimentEnvironment(shouldShuffle = false) {
  try {
    // 1. Parse URL parameters
    const urlParams = getUrlParameters();

    // 2. Set object count
    setObjCount(6);
    User.num_objects = 6;
    // set based on `v=zeta`
    // if (urlParams.v !== undefined && urlParams.v === "zeta") {
    //   setObjCount(6);
    //   User.num_objects = 6;
    // } else {
    //   setObjCount(5);
    //   User.num_objects = 5;
    // }

    // Load Exp Params
    setAIRevealCounts(1);
    setAIHelpType(AI_HELP_TYPE.HIGH_COST_AI);

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
        let rawData = results.data;

        if (isNoAIExpGroup() && shouldShuffle) {
          const shuffleMaxId = getShuffleMaxId();

          const trialsToShuffle = rawData.filter(
            (row) => Number(row.id) >= 0 && Number(row.id) <= shuffleMaxId
          );

          const trialsToKeep = rawData.filter(
            (row) => Number(row.id) > shuffleMaxId
          );

          const shuffledTrials = shuffleArray(trialsToShuffle);

          rawData = [...shuffledTrials, ...trialsToKeep];
        }

        const parsedData = rawData.map((row) => {
          const question_id = Number(row["id"]);
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
          let originalStyle = [];
          if (row["style"]) {
            try {
              originalStyle = JSON.parse(row["style"].replace(/'/g, '"'));
            } catch (e) {
              console.warn("Failed to parse style:", row["style"]);
              originalStyle = Array(answer.length).fill("blank");
            }
          }

          const styleMap = {};
          answer.forEach((name, i) => {
            styleMap[name] = originalStyle[i] || "blank";
          });
          const style = options.map((name) => styleMap[name]);

          return {
            question_id,
            answer,
            options,
            instruction,
            style,
            sortedStyle: originalStyle,
            statements,
            front_end,
          };
        });

        setQuestionsData(parsedData); // for NO AI version

        // for AI version: shuffle questions by phase
        phaseState.PHASE_QUESTIONS.phase1 = shuffleArray(
          parsedData.filter(
            (row) => row.question_id >= 0 && row.question_id <= 9
          )
        );
        phaseState.PHASE_QUESTIONS.phase2 = shuffleArray(
          parsedData.filter(
            (row) => row.question_id >= 10 && row.question_id <= 39
          )
        );
        phaseState.PHASE_QUESTIONS.phase3 = shuffleArray(
          parsedData.filter(
            (row) => row.question_id >= 40 && row.question_id <= 49
          )
        );
        phaseState.PHASE_QUESTIONS.extra = parsedData
          .filter((row) => row.question_id >= 50)
          .sort((a, b) => a.id - b.id);

        bindTrialButtons();
        await loadModal(); // Make sure modal loads before experiment
        // await startExperiment(false, false);
        await startExperiment(true, true);
      },
    });
  } catch (error) {
    console.error("❌ Failed to initialize environment:", error);
  }
}

export async function startExperiment(
  skipConsent = false,
  skipComprehension = false
) {
  if (!skipConsent) {
    checkUserParticipation();
    showConsent();
    return;
  }

  await continueExperiment(skipConsent, skipComprehension);
}

async function continueExperiment(skipConsent, skipComprehension) {
  const shouldBlock = await checkUserParticipation();
  if (shouldBlock) return;

  if (!skipComprehension) {
    shouldShowComprehensionCheck();
    showEnterComprehensionTrialsPopUp();
  }

  gameContainer.style.display = "flex";
  startGame();
}

export function startGame() {
  nextTrial();
}

await initExperimentEnvironment();
