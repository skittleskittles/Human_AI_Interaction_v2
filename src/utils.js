export function getUserAnswer() {
  return Array.from(document.querySelectorAll(".box")).map((box) =>
    box.children.length ? box.children[0].id : null
  );
}

export function evaluateAnswer(userAns, correctAns) {
  let correctCount = 0;
  const total = correctAns.length;
  let totalScore = 0;

  for (let i = 0; i < total; i++) {
    const placed = userAns.indexOf(correctAns[i]);
    if (placed !== -1) {
      const dist = Math.abs(placed - i);
      totalScore += (total - dist) / total;
      if (placed === i) correctCount++;
    }
  }

  const accuracy = ((totalScore / total) * 100).toFixed(1);
  return { correctCount, accuracy };
}
