// index.js
const { Client, Databases, Query } = require("node-appwrite");
const dotenv = require("dotenv");
dotenv.config();

module.exports = async ({ req, res, log, error }) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const db = process.env.APPWRITE_DB;
    const bookings_collection = process.env.APPWRITE_BOOKINGS_COLLECTION;
    const today = new Date();

    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const currentMinutes = today.getHours() * 60 + today.getMinutes();
    const formatted = `${day}/${month}/${year}`;

    console.log(formatted);

    const times = [540, 660, 780, 900, 1020]
    const convertedTimes = ['10:00am till 12:00pm', '12:00pm till 2:00pm', '2:00pm till 4:00pm', '4:00pm till 6:00pm', '6:00pm till 8:00pm']

    const docs = await databases.listDocuments(db, bookings_collection, [
        Query.equal("selectedDate", formatted)
    ]);

    docs.documents.forEach(doc => {
        if (currentMinutes >= times[doc.selectedTime]) {
            let booking_id = doc.$id;
            let payload = {
                "text": "*📅 Unassigned Bookings*",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*📅 Booking Alert*"
                        }
                    },
                    {
                        "type": "section",
                        "fields": [
                            {
                                "type": "mrkdwn",
                                "text": `*🔖 Booking ID:*\n${booking_id}`
                            },
                            {
                                "type": "mrkdwn",
                                "text": `*👤 Booker Name:*\n${doc.user_name}`
                            },
                            {
                                "type": "mrkdwn",
                                "text": `*📆 Date:*\n${formatted}`
                            },
                            {
                                "type": "mrkdwn",
                                "text": `*⏰ Time:*\n${convertedTimes[doc.selectedTime]}`
                            },
                            {
                                "type": "mrkdwn",
                                "text": `*📞 Phone:*\n${doc.phone_number}`
                            }
                        ]
                    }
                ]
            }

            fetch("https://hooks.slack.com/services/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", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            })
                .then(res => {
                    if (!res.ok) throw new Error(`Slack error: ${res.status}`);
                    return res.text();
                })
                .then(data => console.log("Message sent:", data))
                .catch(err => console.error("Error:", err));

        }
        if (currentMinutes >= (times[doc.selectedTime] + 60)) {
            let booking_id = doc.$id;
            databases.updateDocument(db, bookings_collection, booking_id, {
                status: "overdue"
            })
        }
    });

  return context.res.empty();
}
