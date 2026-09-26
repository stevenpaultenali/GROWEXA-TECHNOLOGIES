const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const db = require("./database");

const app = express();
const PORT = 3000;


// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());
app.use(express.json());


// ===============================
// ADMIN LOGIN SETTINGS
// ===============================

const sessions = new Set();

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";


// ===============================
// AUTHENTICATION
// ===============================

function requireAuth(req, res, next) {

    const authHeader = req.headers.authorization;

    const token = authHeader
        ? authHeader.replace("Bearer ", "")
        : null;

    if (!token || !sessions.has(token)) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    next();
}


// ===============================
// SERVE WEBSITE
// ===============================

app.use(
    express.static(
        path.join(__dirname, "..")
    )
);


// ===============================
// HOME PAGE
// ===============================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "..", "index.html")
    );
});


// ===============================
// CREATE ENQUIRY
// PUBLIC - NO LOGIN REQUIRED
// ===============================

app.post("/api/enquiries", (req, res) => {

    try {

        const {
            name,
            email,
            service,
            details
        } = req.body;

        if (!name || !email) {

            return res.status(400).json({
                success: false,
                message: "Name and email are required."
            });
        }

        const result = db.prepare(`
            INSERT INTO enquiries
            (name, email, service, details)
            VALUES (?, ?, ?, ?)
        `).run(
            name,
            email,
            service || "",
            details || ""
        );

        res.json({
            success: true,
            message: "Enquiry saved successfully!",
            id: result.lastInsertRowid
        });

    } catch (error) {

        console.error("CREATE ENQUIRY ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Failed to save enquiry."
        });
    }
});


// ===============================
// ADMIN LOGIN
// ===============================

app.post("/api/login", (req, res) => {

    const {
        username,
        password
    } = req.body;

    if (
        username === ADMIN_USERNAME &&
        password === ADMIN_PASSWORD
    ) {

        const token =
            crypto.randomBytes(32).toString("hex");

        sessions.add(token);

        return res.json({
            success: true,
            token: token
        });
    }

    res.status(401).json({
        success: false,
        message: "Invalid username or password."
    });
});


// ===============================
// GET ALL ENQUIRIES
// ADMIN ONLY
// ===============================

app.get(
    "/api/enquiries",
    requireAuth,
    (req, res) => {

        try {

            const enquiries = db.prepare(`
                SELECT *
                FROM enquiries
                ORDER BY id DESC
            `).all();

            res.json({
                success: true,
                enquiries: enquiries
            });

        } catch (error) {

            console.error(
                "GET ENQUIRIES ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to load enquiries."
            });
        }
    }
);


// ===============================
// UPDATE ENQUIRY STATUS
// ADMIN ONLY
// ===============================

app.put(
    "/api/enquiries/:id/status",
    requireAuth,
    (req, res) => {

        try {

            const id = req.params.id;
            const { status } = req.body;

            const allowedStatuses = [
                "New",
                "Contacted",
                "Completed"
            ];

            if (!allowedStatuses.includes(status)) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid status."
                });
            }

            const result = db.prepare(`
                UPDATE enquiries
                SET status = ?
                WHERE id = ?
            `).run(
                status,
                id
            );

            if (result.changes === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Enquiry not found."
                });
            }

            res.json({
                success: true,
                message: "Status updated successfully."
            });

        } catch (error) {

            console.error(
                "UPDATE STATUS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to update status."
            });
        }
    }
);


// ===============================
// DELETE ENQUIRY
// ADMIN ONLY
// ===============================

app.delete(
    "/api/enquiries/:id",
    requireAuth,
    (req, res) => {

        try {

            const id = req.params.id;

            const result = db.prepare(`
                DELETE FROM enquiries
                WHERE id = ?
            `).run(id);

            if (result.changes === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Enquiry not found."
                });
            }

            res.json({
                success: true,
                message: "Enquiry deleted successfully."
            });

        } catch (error) {

            console.error(
                "DELETE ENQUIRY ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to delete enquiry."
            });
        }
    }
);


// ===============================
// START SERVER
// ===============================

const server = app.listen(
    PORT,
    "127.0.0.1",
    () => {

        console.log(
            `GROWEXA website + backend running at http://127.0.0.1:${PORT}`
        );
    }
);


server.on("error", (error) => {

    console.error(
        "SERVER ERROR:",
        error
    );
});


// Keep server running
setInterval(() => {
    // Server keep-alive
}, 1000);