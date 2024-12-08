import nodemailer from "nodemailer";

const sendEmail = async (to, subject, message) => {
    try {
        // Create a transporter
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        // Define the email options
        const mailOptions = {
            from: process.env.EMAIL_USERNAME, // Sender address
            to, // Receiver email address
            subject, // Subject line
            text: message, // Plain text message
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        console.log("Error sending email -> ", error);
        throw new Error("Email sending failed");
    }
};

export default sendEmail;
