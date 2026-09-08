function draftCharacterScore(outcome) {
  let score = 0;
  if (outcome.survived) score += 30;
  if (outcome.topThirdScreentime) score += 20;
  if (outcome.hadTeamUp) score += 15;
  return score;
}

function draftTeamScore(characterOutcomes) {
  return characterOutcomes.reduce((sum, o) => sum + draftCharacterScore(o), 0);
}

module.exports = { draftCharacterScore, draftTeamScore };
