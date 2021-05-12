const functions = require("firebase-functions");
var request = require('request');
let alphaVintageAPIKey = process.env.alphaVintageAPIKey;

const COL_CURRENCIES = 'currencies'
var admin = require("firebase-admin");

exports.updateCurrencyValues = functions.pubsub.schedule('every 30 minutes').onRun(async (context) => {
    console.log('This will be run every 30 minutes!');

    const db = admin.firestore();
    
    let exchangeRateUSDtoBRL = await getExchangeRate('USD', 'BRL');
    await updateCurrencyExchangeValue('USD', 'BRL', exchangeRateUSDtoBRL);
    return null;

    async function getExchangeRate(from, to) {
        return await new Promise(function(resolve, reject){
            var options = {
                'method': 'GET',
                'url': `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${alphaVintageAPIKey}`
            };
            request(options, function (error, response) {
                if (error)  {
                    throw new Error(error);
                }
                console.log(response.body);
                let data = JSON.parse(response.body);
                let exchangeRate = data["Realtime Currency Exchange Rate"]["5. Exchange Rate"];
                resolve(exchangeRate);
            });
        });
    }
    
    async function updateCurrencyExchangeValue(from, to, value) {
        const docRef = db.collection(COL_CURRENCIES).doc(`${from}${to}`)
        await docRef.set({
            'from': from,
            'to': to,
            'value': value
        })
        return docRef;
    }
});