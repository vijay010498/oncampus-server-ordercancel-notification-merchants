'use strict';
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const ORDERDB = functions.config().database.orderdb;
exports.sendOrderCancelledPartner =
functions.database.instance(ORDERDB).ref('Orders/{orderId}')
    .onWrite(async (snapshot, context) =>{
        console.log('Order Id',context.params.orderId)
        const orderSnap = snapshot.after;
        const order = orderSnap.val();
        const orderId = context.params.orderId;
        const restaurantId = order.restaurantId;
        console.log('Restaurant Id',restaurantId);
        const currentStatus = order.orderStatus;
        if(currentStatus == -3){
            //Order Cancelled by user so notify partner
            //first get restaurant User Id
            var ref = admin.app().database('https://eatitv2-75508-partnerdb.firebaseio.com/').ref();
            ref.child('Partner').orderByChild('restaurant').equalTo(restaurantId)
                .once('value').then( async snap =>{
                    snap.forEach(childSnap => {
                        const partnerId = childSnap.val().uid;
                        console.log('Partner UID',partnerId);

                        //Get Token from TOKEN DB
                        let app = admin.app();
                        var ref1 = app.database('https://eatitv2-75508-alltokens.firebaseio.com/').ref('Tokens/' +partnerId+ '/token');
                        ref1.once("value", async function(data) {
                            console.log('Partner Token',data.val());
                            const partnerToken = data.val();
                            const payload = {
                                notification : {
                                    title : 'Order has been cancelled by user!',
                                    body : 'The order ' +orderId+ ' has been cancelled by user. Please stop preparing the food'
 
                                }
                            };
                            try {
                                const response = await admin.messaging().sendToDevice(partnerToken, payload);
                                console.log("Notification sent Successfully", response);
                            }
                            catch (error) {
                                console.log("Notification sent failed", error);
                            }
                        });
                    });
            }).catch(error => {
                console.log("ERROR",error);
            });
        }
        return null;

    });