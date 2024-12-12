// import nodemailer from "nodemailer";
// import mongoose from "mongoose"; // Assuming you use MongoDB
// import { NGO } from "../models/ngoModel.js"; // Your NGO schema

import { Ngo } from "../models/ngo.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const sendEmail = async (req, res) => {
    try {
        const { longitude, latitude } = req.body;

        // Define search radius in kilometers
        const radiusInKm = 10;

        // Find nearby NGOs within the radius
        const nearbyNGOs = await Ngo.find({
            location: {
                $geoWithin: {
                    $centerSphere: [[longitude, latitude], radiusInKm / 6378.1],
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

        // Nodemailer setup
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASS,
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

        res.status(200).json(
            new ApiResponse(200, null, "Emails sent successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Failed to send emails");
    }
};
