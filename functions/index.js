const functions = require("firebase-functions");
const CeiCrawler = require('cei-crawler');
const { CeiErrorTypes } = require('cei-crawler')

const COL_INSTITUTION = 'institutions'
const COL_ASSETS = 'assets'
const COL_USERS = 'users'

var admin = require("firebase-admin");
admin.initializeApp();


exports.importCei = functions.https.onCall( async (data, context) => {
    const db = admin.firestore();
    // functions.logger.info("Hello logs!", {structuredData: true});
    
    console.log(data);
    
    let userId = data.userId;
    let cpf_cei = data.cpf_cei;
    let password_cei = data.password_cei;
    await init();
    
    return {
        'message': "All done!!!"
    };

    async function init() {
        const usersToUpdate = await (db.collection(COL_USERS).where('uid', '=', userId)).get();
        for(const userSnapshot of usersToUpdate.docs) {
            await getWalletForUser(userSnapshot)
        }
    }

    async function getWalletForUser(user) {
        const userData = user.data();
        const ceiCrawler = new CeiCrawler(cpf_cei, password_cei, { navigationTimeout: 20000 });
        try {
            const wallet = await ceiCrawler.getWallet();
            await compute(wallet, userData.uid)
        } catch (err) {
            console.log(err)
            if (err.name === 'CeiCrawlerError') {
                // if (err.type === CeiErrorTypes.LOGIN_FAILED)
                
                // else if (err.type === CeiErrorTypes.WRONG_PASSWORD)
                //   // Handle wrong password
                // else if (err.type === CeiErrorTypes.SUBMIT_ERROR)
                //   // Handle submit error
                // else if (err.type === CeiErrorTypes.SESSION_HAS_EXPIRED)
                //   // Handle session expired
                // else if (err.type === CeiErrorTypes.NAVIGATION_TIMEOUT)
                //   // Handle request timeout
                console.log(err)
            } else {
                // Handle generic errors
                console.log(err)
            }
        }
    }

    async function compute(wallet, user_id) {
        for(const institutionItem of wallet) {
            const institution = institutionItem.institution;
            const institutionRef = await getCreateInstitution(institution)

            const stocks = institutionItem.stockWallet;
            for(const stock of stocks) {
                const snapshot = await (db.collection(COL_ASSETS).where('user_id', '=', user_id).where('code', '=', stock.code).get());
                for(const doc of snapshot.docs) {
                    await doc.ref.delete();
                }
                const docStock = db.collection(COL_ASSETS).doc()
                stock.institutionId = institutionRef.id
                stock.user_id = user_id;
                // console.log(stock);
                await docStock.set(stock)
            }
        }
    }

    async function getCreateInstitution(institution) {
        const snapshot = await db.collection(COL_INSTITUTION).where(
            'name', '==', institution
        ).get()

        if(snapshot.empty) {
            const docRef = db.collection(COL_INSTITUTION).doc()
            await docRef.set({
                name: institution,
                country: 'BR'
            })
            return docRef;
        }

        return snapshot.docs[0];
    }

});