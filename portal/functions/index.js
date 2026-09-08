const admin = require('firebase-admin');
admin.initializeApp();

const { onSubmissionCreate } = require('./submitPrediction.js');
const { onDraftPickCreate } = require('./draftPick.js');
const { revealPhase5 } = require('./revealPhase5.js');
const { onJudgeScoreCreate } = require('./judgeScore.js');

exports.onSubmissionCreate = onSubmissionCreate;
exports.onDraftPickCreate = onDraftPickCreate;
exports.revealPhase5 = revealPhase5;
exports.onJudgeScoreCreate = onJudgeScoreCreate;
