// index.js
const { Client, Databases, Query, ID } = require("node-appwrite");
const dotenv = require("dotenv");
dotenv.config();

module.exports = async ({ req, res, log, error }) => {
    const client = new Client()
        .setKey(process.env.APPWRITE_API_KEY)

    const databases = new Databases(client);
    const db = process.env.APPWRITE_DB;
    const bookings_collection = process.env.APPWRITE_BOOKINGS_COLLECTION;
    const receipt_collection = process.env.APPWRITE_RECEIPT_COLLECTION;
    const monthly_collection = process.env.APPWRITE_MONTHLY_COLLECTION
    const today = new Date();

    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const currentMinutes = today.getHours() * 60 + today.getMinutes() + 180;
    const formatted = `${day}/${month}/${year}`;
    let booking_id

    const { receipt_id, status } = JSON.parse(req.body ?? '{}');
    log(`Received delete request for userId: ${receipt_id}`);


    if (status == 'paid') {
        try {
            (async () => {
                await databases.updateDocument(db, receipt_collection, receipt_id, {status: 'paid', date_paid: formatted})
                let receipt = await databases.getDocument(db, receipt_collection, receipt_id);
                booking_id = receipt.booking_id;
                await databases.updateDocument(db, bookings_collection, booking_id, {status: 'completed_paid'})

                
            })()
        } catch (error) {
            console.log(error)
        }
    } else if (status == 'unpaid') {
        try {
            (async () => {
                let receipt = await databases.getDocument(db, receipt_collection, receipt_id);
                const monthlyData = await databases.listDocuments(db, monthly_collection, [Query.equal('date', receipt.month_key)])
                if (!monthlyData) {
                    await databases.createDocument(db, monthly_collection, ID.unique(), {date: receipt.month_key, unpaid: receipt.total, paid: 0})
                } else if (monthlyData) {
                    await databases.updateDocument(db, monthly_collection, monthlyData.documents[0].$id, {unpaid: monthlyData.documents[0].unpaid + receipt_total})
                }
            })()
        } catch (error) {
            console.log(error)
        }
        

    }

    


    



    return res.json({ success: true });
}
