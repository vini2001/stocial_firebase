const functions = require("firebase-functions");
var request = require('request');
var yahooFinance = require('yahoo-finance');
var async = require("async");


var admin = require("firebase-admin");

const COL_ASSETS = 'assets'
const COL_TICKERS = 'tickers'

let iexToken = 'sk_4bb59ba9e4e24b39aef29ccf8b8ba672';

exports.getQuotes = functions.https.onCall( async (data, context) => {
    const db = admin.firestore();
    
    let uid = 'mhTjeOzxIHb9lFeGycDVrHsiTts1';//context.auth?.uid;
    
    let success = await init();
    
    if(success) {
        return {
            'message': "All done!!!"
        };    
    }else{
        return {
            'message': "Unauthorized"
        };
    }

    async function init() {
        if(uid == null) return false;
        let tickers = await getAllTickersForUser();

        let americanTickers = tickers['American Dollars'];
        let americanTickersToUpdate = await getOutdatedTickersList(americanTickers);
        await updateTickersPricesAmericanDollars(americanTickersToUpdate);

        let brazilianTickers = tickers['undefined'];
        let brazilianTickersToUpdate = await getOutdatedTickersList(brazilianTickers);
        await updateBrazilianTickers(brazilianTickersToUpdate);
        return true;
    }
    
    async function getAllTickersForUser() {
        const snapshot = await (db.collection(COL_ASSETS).where('user_id', '=', uid).get());
        var tickersCodes = {};
        for(const doc of snapshot.docs) {
            let code = doc.data().code;
            let currency = doc.data().currency;
            if(!tickersCodes[currency]) tickersCodes[currency] = [];
            else tickersCodes[currency].push(code);
        }
        return tickersCodes;
    }

    async function getOutdatedTickersList(tickers) {

        let limitDate = new Date();
        limitDate.setMinutes( limitDate.getMinutes() - 20 );

        var tickersToUpdate = [];
        for(const ticker of tickers) {
            const snapshot = await (db.collection(COL_TICKERS).where('symbol', '=', ticker).where('lastRefresh', '>', limitDate).get());
            if(snapshot.docs.length == 0) {
                tickersToUpdate.push(ticker);
            }
        }
        return tickersToUpdate;
    }

    async function updateTickersPricesAmericanDollars(tickers) {
        if(tickers.length == 0) return;
        for(var i = 0; i <= tickers.length / 100; i++) {
            let items = tickers.slice(i*100, (i+1)*100);
            let queryTickers = items.join(',');

            var options = {
                'method': 'GET',
                'url': `https://cloud.iexapis.com/v1/stock/market/batch?&types=quote&symbols=${queryTickers}&token=${iexToken}`
            };
            request(options, async function (error, response) {
                if (error) throw new Error(error);
                let data = JSON.parse(response.body);
                for(var code in data) {
                    item = data[code].quote;
                    item.lastRefresh = new Date();
                    item.currency = 'American Dollars';
                    await upsertTickerData(item);
                }
            });
        }
    }

    async function updateBrazilianTickers(tickers) {
        await new Promise(function(resolve, reject){
            async.eachOfLimit(tickers, 10, async function(ticker, key, ecb){
                try{
                    yahooFinance.quote({
                        symbol: `${ticker}.SA`,
                        modules: [ 'price' ] // see the docs for the full list
                    }, async function (err, quotes) {
                        if(!err) {
                            let item = quotes.price;
                            item.symbol = item.symbol.replace('.SA', '');
                            item.currency = 'Brazilian Reais';
                            item.lastRefresh = new Date();
                            await upsertTickerData(item);
                        }
                    }).catch(error => { console.log("ignored", error)});
                }catch(e) {
                    console.log("error: " + e);
                }
            }, 
            function(err){       
                if(err) {
                    console.log("async error " + err);
                    reject(err);
                }else{
                    resolve(true);
                }
            })
        });
    }

    async function upsertTickerData(item) {
        const snapshot = await (db.collection(COL_TICKERS).where('symbol', '=', item.symbol).get());
        var doc;
        if(snapshot.docs.length == 0) {
            doc = db.collection(COL_TICKERS).doc();
        } else {
            doc = snapshot.docs[0].ref;
        }
        await doc.set(item);
    }

});