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

  const rawAccuracy = (totalScore / total) * 100;
  const accuracy =
    rawAccuracy % 1 === 0
      ? Number(rawAccuracy.toFixed(0))
      : Number(rawAccuracy.toFixed(1));
  return { correctChoice, accuracy };
}

export function getCurrentDate() {
  return new Date();
}
