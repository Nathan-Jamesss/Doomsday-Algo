const WEIGHTS = { predict: 0.5, draft: 0.2, report: 0.3 };

function combineLeaderboard(predictPct, draftPct, reportPct) {
  const total = Math.round(
    (WEIGHTS.predict * predictPct + WEIGHTS.draft * draftPct + WEIGHTS.report * reportPct) * 100
  ) / 100;
  return { total, predictPct, draftPct, reportPct };
}

function rankTeams(teams) {
  return [...teams].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.predictRaw !== a.predictRaw) return b.predictRaw - a.predictRaw;
    return a.submittedAt - b.submittedAt;
  });
}

module.exports = { combineLeaderboard, rankTeams };
