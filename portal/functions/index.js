const admin = require('firebase-admin');
admin.initializeApp();

const { onSubmissionCreate } = require('./submitPrediction.js');

// Filled in by Task 8 (submitPrediction, submitDraftPick) and
// Task 9 (revealPhase5).
exports.onSubmissionCreate = onSubmissionCreate;
