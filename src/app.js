import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
    express.json({
        limit: "16kb",
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "16kb",
    })
);

app.use(express.static("public"));

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);

app.use(cookieParser());

// importing the routes
import foodDonorRouter from "./routes/foodDonor.route.js";
import ngoRouter from "./routes/ngo.route.js";
import mapsRouter from "./routes/maps.route.js";
import deliveryRouter from "./routes/delivery.route.js"
import foodItemRouter from "./routes/foodItem.route.js"

// declaring the routes
app.use("/api/v1/foodDonors", foodDonorRouter);
app.use("/api/v1/ngos", ngoRouter);
app.use("/api/v1/maps", mapsRouter);
app.use("/api/v1/delivery", deliveryRouter);
app.use("/api/v1/foodItems", foodItemRouter)

export default app;
