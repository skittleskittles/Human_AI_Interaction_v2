export function getUserAnswer() {
  return Array.from(document.querySelectorAll(".box")).map((box) =>
    box.children.length ? box.children[0].id : null
  );
}

export function evaluateAnswer(userAns, correctAns) {
  let correctChoice = 0;
  const total = correctAns.length;
  let totalScore = 0;

  for (let i = 0; i < total; i++) {
    const placed = userAns.indexOf(correctAns[i]);
    if (placed !== -1) {
      const dist = Math.abs(placed - i);
      totalScore += (total - dist) / total;
      if (placed === i) correctChoice++;
    }
  }

  const rawScore = (totalScore / total) * 100;
  const score =
    rawScore % 1 === 0
      ? Number(rawScore.toFixed(0))
      : Number(rawScore.toFixed(1));
  return { correctChoice, score };
}

export function getCurDate() {
  return new Date();
}

export function getUrlParameters() {
  const searchParams = new URLSearchParams(window.location.search);
  const params = {};
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }
  return params;
}

export function generateUID(length = 16) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let uid = "";
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);

  for (let i = 0; i < length; i++) {
    uid += chars[array[i] % chars.length];
  }

  return "test_" + uid;
}

/**
 * Adds a pixel value and rem value together and returns the result in px.
 * @param {number} px - The base pixel value.
 * @param {number} rem - The rem value to add (e.g., 0.2).
 * @returns {string} - The total width in pixels, as a string with "px" unit.
 */
export function addPxAndRem(px, rem) {
  const remInPx = parseFloat(
    getComputedStyle(document.documentElement).fontSize
  );
  const total = px + rem * remInPx;
  return `${total}px`;
}

/**
 * Redirect Prolific Related
 */
export function redirectProlificCompleted() {
  // Default (pass attention check and finish all 20 minutes + finish survey)
  setTimeout(() => {
    window.location.replace(
      "https://app.prolific.com/submissions/complete?cc=CUNOOJZ6"
    );
  }, 3000);
}

export function redirectProlificBonusPayment() {
  // Bonus Payment (pass attention check and finish all 20 minutes + get good performance + finish survey)
  setTimeout(() => {
    window.location.replace(
      "https://app.prolific.com/submissions/complete?cc=C1NUH6S1 "
    );
  }, 3000);
}

export function redirectProlificFailedAllAttentionCheck() {
  // Fail attention check and finish all 20 minutes + finish survey
  setTimeout(() => {
    window.location.replace(
      "https://app.prolific.com/submissions/complete?cc=CCTMPD57"
    );
  }, 3000);
}
