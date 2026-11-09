
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Check environment variables
if (!process.env.MONGODB_URI || !JWT_SECRET) {
    throw new Error("Please check your .env file.");
}

// Homepage
app.get("/", (req, res) => {
    res.redirect("/register.html");
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch(error => console.log("MongoDB Error:", error.message));

// Student Schema
const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    year: { type: String, required: true },
    password: { type: String, required: true }
});

const Student = mongoose.model("Student", studentSchema);

// Event Schema
const eventSchema = new mongoose.Schema({
    title: String,
    description: String,
    date: String,
    venue: String,
    category: String
});

const Event = mongoose.model("Event", eventSchema);

// Event Registration Schema
const registrationSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true
    }
});

registrationSchema.index(
    { student: 1, event: 1 },
    { unique: true }
);

const Registration = mongoose.model("Registration", registrationSchema);

// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            error: "Please login first."
        });
    }

    jwt.verify(token, JWT_SECRET, (error, user) => {
        if (error) {
            return res.status(403).json({
                error: "Invalid or expired login."
            });
        }

        req.user = user;
        next();
    });
}

// Student Registration
app.post("/register", async (req, res) => {
    try {
        const { name, email, department, year, password } = req.body;

        if (!name || !email || !department || !year || !password) {
            return res.status(400).json({
                error: "Please fill in all fields."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: "Password must contain at least 8 characters."
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const existingStudent = await Student.findOne({
            email: normalizedEmail
        });

        if (existingStudent) {
            return res.status(409).json({
                error: "Email already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const student = new Student({
            name: name.trim(),
            email: normalizedEmail,
            department,
            year,
            password: hashedPassword
        });

        await student.save();

        res.status(201).json({
            message: "Registration successful!"
        });

    } catch (error) {
        console.log("Registration Error:", error.message);
        res.status(500).json({
            error: "Registration failed."
        });
    }
});

// Student Login
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const student = await Student.findOne({
            email: (email || "").toLowerCase().trim()
        });

        if (!student || !(await bcrypt.compare(password || "", student.password))) {
            return res.status(401).json({
                error: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            { id: student._id },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful!",
            token,
            name: student.name
        });

    } catch (error) {
        console.log("Login Error:", error.message);
        res.status(500).json({
            error: "Login failed."
        });
    }
});

// Get Student Details
app.get("/api/me", authenticateToken, async (req, res) => {
    try {
        const student = await Student.findById(req.user.id)
            .select("name email department year");

        if (!student) {
            return res.status(404).json({
                error: "Student not found."
            });
        }

        res.json(student);

    } catch (error) {
        res.status(500).json({
            error: "Could not load student details."
        });
    }
});

// Add Sample Events
async function addSampleEvents() {
    const count = await Event.countDocuments();

    if (count === 0) {
        await Event.insertMany([
            {
                title: "TechFest 2026",
                description: "Explore technology, coding competitions and exciting innovations.",
                date: "2026-12-10",
                venue: "Main Auditorium",
                category: "Technical"
            },
            {
                title: "College Hackathon",
                description: "Build creative solutions and showcase your coding skills.",
                date: "2026-12-15",
                venue: "Computer Science Block",
                category: "Technical"
            },
            {
                title: "Cultural Fest",
                description: "Celebrate music, dance, art and college talent.",
                date: "2026-12-20",
                venue: "College Ground",
                category: "Cultural"
            },
            {
                title: "Photography Contest",
                description: "Capture memorable moments and share your creativity.",
                date: "2026-12-22",
                venue: "Seminar Hall",
                category: "Arts"
            },
            {
                title: "Sports Day",
                description: "Participate in exciting indoor and outdoor sports.",
                date: "2027-01-05",
                venue: "Sports Ground",
                category: "Sports"
            },
            {
                title: "Dance Competition",
                description: "Show your moves in an energetic dance competition.",
                date: "2027-01-10",
                venue: "Open Stage",
                category: "Cultural"
            }
        ]);

        console.log("Sample events added successfully.");
    }
}

// Get All Events
app.get("/api/events", authenticateToken, async (req, res) => {
    try {
        const events = await Event.find().sort({ date: 1 });
        res.json(events);

    } catch (error) {
        res.status(500).json({
            error: "Could not load events."
        });
    }
});

// Join an Event
app.post("/api/events/:id/join", authenticateToken, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                error: "Event not found."
            });
        }

        const existing = await Registration.findOne({
            student: req.user.id,
            event: event._id
        });

        if (existing) {
            return res.status(409).json({
                error: "You have already joined this event."
            });
        }

        await Registration.create({
            student: req.user.id,
            event: event._id
        });

        res.status(201).json({
            message: "Successfully joined " + event.title + "!"
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                error: "You have already joined this event."
            });
        }

        res.status(500).json({
            error: "Could not join event."
        });
    }
});

// Get My Registered Events
app.get("/api/my-events", authenticateToken, async (req, res) => {
    try {
        const registrations = await Registration.find({
            student: req.user.id
        }).populate("event");

        const events = registrations
            .filter(item => item.event)
            .map(item => item.event);

        res.json(events);

    } catch (error) {
        res.status(500).json({
            error: "Could not load your events."
        });
    }
});

// Start Server
async function startServer() {
    try {
        await mongoose.connection.asPromise();
        await addSampleEvents();

        app.listen(PORT, () => {
            console.log("MongoDB Connected Successfully");
            console.log("College Event Management running at http://localhost:" + PORT);
        });

    } catch (error) {
        console.log("Server startup error:", error.message);
        process.exit(1);
    }
}

startServer();
