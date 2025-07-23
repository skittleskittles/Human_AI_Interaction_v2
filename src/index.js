import {gameContainer} from "./data/domElements.js";
import {
    getGroupType,
    getObjCount,
    getShuffleMaxId,
    GROUP_TYPE,
    GROUP_TYPE_NAME_MAP,
    isNoAIGroup,
    PHASE_NAME,
    phaseState,
    setAIRevealCounts,
    setCurPhase,
    setGroupType,
    setObjCount,
    setQuestionsData,
    shouldShowComprehensionCheck,
    URL_GROUP_CODE_MAP,
} from "./data/variable.js";
import {User} from "./collectData.js";
import {loadModal, showEnterComprehensionTrialsPopUp} from "./modal.js";
import {bindTrialButtons, nextTrial} from "./trialAction.js";
import Papa from "papaparse";
import {generateUID, getUrlParameters, shuffleArray} from "./utils.js";
import {showConsent} from "./consent.js";
import {checkUserParticipation} from "./checkUserStatus.js";

async function initExperimentEnvironment(shouldShuffle = false) {
    try {
        // 1. Parse URL parameters
        const urlParams = getUrlParameters();

        // 2. Set object count
        setObjCount(6);
        User.num_objects = getObjCount();

        // 3. Load Exp Params
        setAIRevealCounts(1);
        const groupCode = urlParams.g;
        if (groupCode in URL_GROUP_CODE_MAP) {
            setGroupType(URL_GROUP_CODE_MAP[groupCode]);
            User.exp_group = GROUP_TYPE_NAME_MAP[getGroupType()];
        } else {
            console.warn("❗Unrecognized group code. Set as default group.");
            setGroupType(GROUP_TYPE.HIGH_COST_AI);
            User.exp_group = GROUP_TYPE_NAME_MAP[getGroupType()];
        }

        // 4. Set Prolific ID (default to random if missing)
        User.prolific_pid = urlParams.PROLIFIC_PID || generateUID();

        // 5. Choose file after objCount set
        const csvFile =
            getObjCount() === 6
                ? "six_objects_instructions.csv"
                : "five_objects_simple.csv";

        // 6. Load CSV data via Papa.parse
        Papa.parse(csvFile, {
            download: true,
            header: true,
            complete: async function (results) {
                let rawData = results.data;

                if (isNoAIGroup() && shouldShuffle) {
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

                    return {
                        question_id,
                        answer,
                        options,
                        instruction,
                        styleMap,
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
                await startExperiment(false, false);
                // await startExperiment(true, false);
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

    setCurPhase(
        skipComprehension ? PHASE_NAME.PHASE1 : PHASE_NAME.COMPREHENSION_CHECK
    );

    gameContainer.style.display = "flex";
    startGame();
}

export function startGame() {
    nextTrial();
}

await initExperimentEnvironment();
