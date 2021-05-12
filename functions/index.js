const importCei = require('./importCei.js');
const getQuotes = require('./getQuotes.js');
const updateCurrencyValues = require('./updateCurrencyConverter.js');

var admin = require("firebase-admin");
admin.initializeApp();

exports.importCei = importCei.importCei;
exports.getQuotes = getQuotes.getQuotes;
exports.updateCurrencyValues = updateCurrencyValues.updateCurrencyValues;