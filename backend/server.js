const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

// Load backend configuration.
dotenv.config({
    path: path.join(__dirname, ".env")
});

// Initialize the database before starting the server.
require("./db");

const timetableRoutes = require("./timetableRoutes");

const app = express();

const PORT = Number(process.env.PORT) || 3000;

const FRONTEND_PATH = path.resolve(
    __dirname,
    "..",
    "frontend"
);

// Middleware.
app.use(cors());

app.use(express.json({
    limit: "100kb"
}));

app.use(express.urlencoded({
    extended: false
}));

// Serve the frontend files.
app.use(express.static(FRONTEND_PATH));

// API routes.
app.use("/api/timetable", timetableRoutes);

// API health-check endpoint.
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Student Timetable API is running.",
        timestamp: new Date().toISOString()
    });
});

// Return the main dashboard.
app.get("/", (req, res) => {
    res.sendFile(
        path.join(FRONTEND_PATH, "index.html")
    );
});

// Handle invalid API endpoints.
app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found."
    });
});

// Handle invalid non-API pages.
app.use((req, res) => {
    res.status(404).send("Page not found.");
});

// Handle invalid JSON and other middleware errors.
app.use((err, req, res, next) => {
    console.error("Server error:", err.message);

    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof SyntaxError && err.status === 400) {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON. Please check your request body."
        });
    }

    res.status(500).json({
        success: false,
        message: "An unexpected server error occurred."
    });
});

// Start the application.
app.listen(PORT, () => {
    console.log("------------------------------------------");
    console.log("STUDENT TIMETABLE MANAGEMENT SYSTEM");
    console.log("------------------------------------------");
    console.log(`Server: http://localhost:${PORT}`);
    console.log(`API:    http://localhost:${PORT}/api/timetable`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
    console.log("------------------------------------------");
});