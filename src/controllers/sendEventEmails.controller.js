// Import required modules
import nodemailer from "nodemailer";
import mongoose from "mongoose"; // Assuming you use MongoDB
import { NGO } from "../models/ngoModel.js"; // Your NGO schema

/**
 * Controller to send emails to nearby NGOs based on food donor's location
 */
export const sendEmail = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ message: "Location is required." });
        }

        // Define search radius in kilometers
        const radiusInKm = 10;

        // Find nearby NGOs within the radius
        const nearbyNGOs = await NGO.find({
            location: {
                $geoWithin: {
                    $centerSphere: [[longitude, latitude], radiusInKm / 6378.1], // Earth radius in km
                },
            },
        });

        if (nearbyNGOs.length === 0) {
            return res
                .status(404)
                .json({ message: "No NGOs found in the specified region." });
        }

        // Prepare email content
        const subject = "Food Donation Opportunity Nearby!";
        const emailBody = `
      <p>Hello,</p>
      <p>We have a food donation opportunity near your location. Please contact the food donor for more details.</p>
      <p>Thank you for your support!</p>
    `;

        // Nodemailer setup (using a test account or real SMTP details)
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USERNAME, // Your email
                pass: process.env.EMAIL_PASS, // Your email password or app password
            },
        });

        // Send emails to all NGOs
        const emailPromises = nearbyNGOs.map((ngo) =>
            transporter.sendMail({
                from: process.env.EMAIL_USERNAME,
                to: ngo.email,
                subject,
                html: emailBody,
            })
        );

        await Promise.all(emailPromises);

        res.status(200).json({
            message: "Emails sent to nearby NGOs successfully!",
        });
    } catch (error) {
        console.error("Error sending emails:", error);
        res.status(500).json({
            message: "An error occurred while sending emails.",
            error: error.message,
        });
    }
};
