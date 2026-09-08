function brierScore(p, actualYes) {
  const prob = p / 100;
  const penalty = actualYes ? Math.pow(1 - prob, 2) : Math.pow(prob, 2);
  return Math.round(100 * (1 - penalty) * 100) / 100;
}

function multiChoiceScore(probabilities, correctOption) {
  const pCorrect = probabilities[correctOption] || 0;
  return brierScore(pCorrect, true);
}

module.exports = { brierScore, multiChoiceScore };
