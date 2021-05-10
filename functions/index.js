const importCei = require('./importCei.js');
const getQuotes = require('./getQuotes.js');

var admin = require("firebase-admin");
admin.initializeApp();

exports.importCei = importCei.importCei;
exports.getQuotes = getQuotes.getQuotes;