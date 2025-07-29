const { Client, Databases, Query, ID } = require("node-appwrite");
const dotenv = require("dotenv");
dotenv.config();

module.exports = async ({ req, res, log, error }) => {
    const client = new Client()
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const db = process.env.APPWRITE_DB;
    const bookings_collection = process.env.APPWRITE_BOOKINGS_COLLECTION;
    const receipt_collection = process.env.APPWRITE_RECEIPT_COLLECTION;
    const monthly_collection = process.env.APPWRITE_MONTHLY_COLLECTION;

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const formatted = `${day}/${month}/${year}`;

    const { receipt_id, status } = JSON.parse(req.body ?? '{}');
    log(`Received update request for receiptId: ${receipt_id} and status: ${status}`);

    try {
        if (status === 'paid') {
            log('started payment process')
            await databases.updateDocument(db, receipt_collection, receipt_id, {
                status: 'paid',
                date_paid: formatted
            });
            const receipt = await databases.getDocument(db, receipt_collection, receipt_id);
            const booking_id = receipt.booking_id;

            await databases.updateDocument(db, bookings_collection, booking_id, {
                status: 'completed_paid'
            });

            const monthlyData = await databases.listDocuments(db, monthly_collection, [
                Query.equal('date', receipt.month_key)
            ]);
            let unpaid = monthlyData.documents[0].unpaid - receipt.total;
            await databases.updateDocument(db, monthly_collection, monthlyData.documents[0].$id, {unpaid})

            const newMonthlyData = await databases.listDocuments(db, monthly_collection, [Query.equal(date, formatted.split(-7))])
            log(newMonthlyData)
            if (!newMonthlyData || newMonthlyData.total === 0) {
                await databases.createDocument(db, monthly_collection, ID.unique(), {
                    date: formatted.split(-7),
                    paid: receipt_total,
                    unpaid: 0
                });
            } else {
                log('trying existing monthly data to add paid info')
                const existing = newMonthlyData.documents[0];
                await databases.updateDocument(db, monthly_collection, existing.$id, {
                    paid: existing.paid + receipt_total
                });
            }

        } else if (status === 'unpaid') {
            const receipt = await databases.getDocument(db, receipt_collection, receipt_id);
            const monthKey = receipt.month_key;
            const receipt_total = receipt.total;

            const monthlyData = await databases.listDocuments(db, monthly_collection, [
                Query.equal('date', monthKey)
            ]);

            if (!monthlyData || monthlyData.total === 0) {
                await databases.createDocument(db, monthly_collection, ID.unique(), {
                    date: monthKey,
                    unpaid: receipt_total,
                    paid: 0
                });
            } else {
                const existing = monthlyData.documents[0];
                await databases.updateDocument(db, monthly_collection, existing.$id, {
                    unpaid: existing.unpaid + receipt_total
                });
            }
        }

        return res.json({ success: true });

    } catch (err) {
        error("Function error:", err.message);
        return res.json({ error: err.message });
    }
};
