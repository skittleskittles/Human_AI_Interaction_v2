import {
  getSubmissionLimit,
  isAttentionCheck,
  isComprehensionCheck,
  isAllowedAskAITrials,
  getAIRevealCounts,
  getGlobalCurTrialIndex,
  getCurQuestionIndex,
  getCurQuestionData,
  calAskAICost,
} from "./data/variable";
import { bindDragDropEvents } from "./dragDrop.js";
import {
  addPxAndRem,
  escapeRegExp,
  evaluateAnswer,
  getUserAnswer,
} from "./utils.js";
import {
  leftPanel,
  labelContainer,
  optionContainer,
} from "./data/domElements.js";
import {updateTotalPassMessage} from "./uiState";

export function renderInstructions(instructionText) {
  let instruction;
  const submitLimit = getSubmissionLimit();

  if (isAttentionCheck()) {
    instruction = `<p>
      This is the attention check problem.</p>
      <p>The timer is paused for this problem.</p>
      <p>You have <span id="submission-count" style="color:brown;">${submitLimit}</span> submission(s) remaining for this problem.</p>
      <p>You need to place all objects correctly to pass this problem.</p>
      <p>If you fail the attention check, you will not get the bonus payment regardless of your overall performance.</p>`;
  } else if (isComprehensionCheck()) {
    instruction = `<p>This is a comprehension check problem.</p>
      <p>You have <span id="submission-count" style="color:brown;">${submitLimit}</span> submission(s) remaining for this problem.</p>
      <p>You need to place all objects correctly to pass this problem.</p>
      <p>If you fail this problem twice, the experiment ends automatically.</p>`;
  } else {
    instruction = `<p>${instructionText}</p>
      <p>You have <span id="submission-count" style="color:brown;">${submitLimit}</span> submission(s) remaining for this problem.</p>
      <p>Solve as many problems as you can correctly in this phase.</p>`;
  }

  document.getElementById("instruction-text").innerHTML = instruction;
}

export function renderAIChat() {
  if (!isAllowedAskAITrials()) {
    leftPanel.style.display = "none";
    return;
  }

  // render left ai chat panel
  leftPanel.style.display = "flex";
  document.getElementById("askAI-btn").textContent =
    `Reveal ${getAIRevealCounts()} ` +
    (getAIRevealCounts() === 1 ? "object's location" : "objects' locations");

  updateAskAICost();

  const chatBox = document.getElementById("ai-chat");
  chatBox.innerHTML = "";
  const initialBubble = document.createElement("div");
  initialBubble.classList.add("chat-bubble", "ai");

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "🤖";

  const msg = document.createElement("div");
  msg.className = "message";
  msg.innerHTML = `<strong>AI:</strong> How can I help?`;

  initialBubble.appendChild(avatar);
  initialBubble.appendChild(msg);
  chatBox.appendChild(initialBubble);
}

export function updateAskAICost() {
  document.getElementById("askAI-cost").textContent = calAskAICost();
}

export function renderBoxesAndOptions(questionData) {
  const options = questionData.options;
  const styleMap = questionData.styleMap || {};

  if (isAttentionCheck()) {
    document.getElementById("trialID").textContent = "ATTENTION CHECK Problem";
  } else {
    document.getElementById("trialID").textContent =
      "Problem " +
      (isComprehensionCheck()
        ? getGlobalCurTrialIndex()
        : getCurQuestionIndex());
  }

  const boxContainer = document.getElementById("box-container");
  boxContainer.innerHTML = "";

  optionContainer.innerHTML = "";
  labelContainer.innerHTML = "";

  // Step 1: Measure option height
  const tempOptions = options.map((id) => {
    const el = document.createElement("div");
    el.className = "option";
    el.style.position = "absolute";
    el.style.visibility = "hidden";
    el.textContent = id;
    document.body.appendChild(el);
    return el;
  });

  const maxHeight = Math.max(
    ...tempOptions.map((el) => el.getBoundingClientRect().height)
  );
  tempOptions.forEach((el) => el.remove());

  // Step 2: Render options and boxes
  options.forEach((optionText, i) => {
    // Top label: 1, 2, ...
    const label = document.createElement("div");
    label.className = "label no-select";
    label.textContent = i + 1;
    labelContainer.appendChild(label);

    // Option
    const option = document.createElement("div");
    option.className = "option no-select";
    option.id = optionText;
    option.textContent = optionText;
    applyPatternStyle(option, styleMap[optionText] || "blank");
    option.style.height = `${maxHeight}px`;
    optionContainer.appendChild(option);

    // Box + optional front/end label
    const boxGroup = document.createElement("div");
    boxGroup.className = "box-group";

    const box = document.createElement("div");
    box.className = "box";
    box.style.height = addPxAndRem(maxHeight, 1);
    boxGroup.appendChild(box);

    if (i === 0 || i === options.length - 1) {
      const label = document.createElement("div");
      label.className = "side-label-under no-select";
      label.id = i === 0 ? "front-label-under" : "end-label-under";
      label.textContent = i === 0 ? "front" : "end"; // default
      boxGroup.appendChild(label);
    }

    boxContainer.appendChild(boxGroup);
  });

  updateSideLabels(questionData.front_end);

  // Step 3: Render solutions
  const solutionContainer = document.getElementById("solution-container");
  solutionContainer.innerHTML = "";

  const answer = questionData.answer;
  answer.forEach((ans, i) => {
    const solution = document.createElement("div");
    solution.className = "solution no-select";
    solution.id = `solution-${ans}`;
    solution.textContent = ans;
    applyPatternStyle(solution, styleMap[ans] || "blank");
    solution.style.height = `${maxHeight}px`;
    solutionContainer.appendChild(solution);
  });

  bindDragDropEvents();
}

export function highlightCorrectUserChice() {
  const userAns = getUserAnswer();
  let correctChoiceCnt, correctChoices, score;

  ({ correctChoiceCnt, correctChoices, score } = evaluateAnswer(
    userAns,
    getCurQuestionData().answer
  ));

  correctChoices.forEach((choice) => {
    const el = document.getElementById(choice);
    if (el) {
      applyPatternStyle(el, getCurQuestionData().styleMap[choice], {
        isCorrect: true,
      });
    }
  });
}

export function applyPatternStyle(element, pattern, isCorrect = false) {
  const color = isCorrect ? "#D3ECCD" : "lightblue";

  const base = {
    blank: color,
    "dotted circles": `repeating-radial-gradient(circle, ${color}, ${color} 5px, white 5px, white 10px)`,
    "horizontal lines": `repeating-linear-gradient(to bottom, ${color}, ${color} 5px, white 5px, white 10px)`,
    "vertical lines": `repeating-linear-gradient(to right, ${color}, ${color} 5px, white 5px, white 10px)`,
    "diagonal stripes": `repeating-linear-gradient(45deg, ${color}, ${color} 5px, white 5px, white 10px)`,
    "horizontal stripes": `repeating-linear-gradient(to right, transparent 0 8px, ${color} 8px 16px),
       repeating-linear-gradient(to bottom, transparent 0 8px, ${color} 8px 16px)`,
  };

  element.style.background = base[pattern] || base["blank"];
}

export function renderStatements(statements, answers) {
  const list = document.querySelector("#statement-box ul");

  const rendered = statements.map((s) => {
    let highlighted = s;
    answers.forEach((answer) => {
      const regex = new RegExp(`\\b${escapeRegExp(answer)}\\b`, "gi");
      highlighted = highlighted.replace(
        regex,
        (match) => `<strong>${match}</strong>`
      );
    });
    return `<li>${highlighted}</li>`;
  });

  list.innerHTML = rendered.join("");
}

export function updateSideLabels(front_end) {
  const frontLabel = document.getElementById("front-label-under");
  const endLabel = document.getElementById("end-label-under");

  if (Array.isArray(front_end) && front_end.length === 2) {
    if (frontLabel) frontLabel.textContent = front_end[0];
    if (endLabel) endLabel.textContent = front_end[1];
  } else {
    if (frontLabel) frontLabel.textContent = "front";
    if (endLabel) endLabel.textContent = "end";
  }
}
