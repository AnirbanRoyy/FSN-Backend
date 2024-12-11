import sendEmail from "./sendMail.js";
import NGO from "../models/ngoModel.js";
import FoodItem from "../models/foodItem.model.js";
import { getGeocode, getTravelInfo } from "./maps.controller.js";

// OpenCage API geocoding function
async function geocodeAddress(address) {
    const apiKey = "040e6c0e5ca9400eaeae724b5223d10a";
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
        address
    )}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry;
        return { lat, lng };
    } else {
        throw new Error("Address not found.");
    }
}

export const sendEventEmails = async (eventId) => {
    try {
        const event = await FoodItem.findById(eventId);
        if (!event) throw new Error("Event not found.");

        const { location, address } = event;
        const donorLocation = location || (await geocodeAddress(address));

        let radius = 5; // Initial search radius in km
        let notificationSent = false;

        const sendEmailsInRadius = async () => {
            if (notificationSent) return;

            const ngos = await NGO.find(); // Fetch all NGOs
            const nearbyNGOs = await Promise.all(
                ngos.map(async (ngo) => {
                    const ngoLocation =
                        ngo.location || (await geocodeAddress(ngo.address));
                    const distance = await getTravelInfo(
                        donorLocation.lat,
                        donorLocation.lng,
                        ngoLocation.lat,
                        ngoLocation.lng
                    );
                    return distance <= radius ? ngo : null;
                })
            );

            const filteredNGOs = nearbyNGOs.filter((ngo) => ngo !== null);
            if (filteredNGOs.length > 0) {
                await Promise.all(
                    filteredNGOs.map((ngo) =>
                        sendEmail(
                            ngo.email,
                            "Food Donation Event Near You",
                            `A food donation event has been scheduled near you. Click the link to learn more: [event/${eventId}]`
                        )
                    )
                );
                notificationSent = true;
            } else {
                console.log(`No NGOs found within ${radius} km.`);
            }

            if (!notificationSent) {
                setTimeout(() => {
                    radius += 5; // Increase radius
                    sendEmailsInRadius();
                }, 2 * 60 * 60 * 1000); // Retry after 2 hours
            }
        };

        sendEmailsInRadius();
    } catch (error) {
        console.error("Error sending event emails:", error.message);
    }
};

export const registerInterest = async (ngoId, eventId) => {
    try {
        const ngo = await NGO.findById(ngoId);
        const event = await FoodItem.findById(eventId);
        if (!ngo || !event) throw new Error("NGO or Event not found.");

        event.interestedNGOs.push(ngoId);
        await event.save();
        console.log("NGO registered interest in the event.");
    } catch (error) {
        console.error("Error registering NGO interest:", error.message);
    }
};
