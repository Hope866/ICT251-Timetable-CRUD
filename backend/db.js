const Database = require("better-sqlite3");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Load environment variables from the backend folder.
dotenv.config({
    path: path.join(__dirname, ".env")
});

// Determine the database location.
const configuredPath = process.env.DB_PATH || "./timetable.db";

const databasePath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(__dirname, configuredPath);

// Open or create the SQLite database.
const db = new Database(databasePath);

// Improve SQLite performance and reliability.
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Read and execute the database schema.
const schemaPath = path.join(__dirname, "schema.sql");

if (!fs.existsSync(schemaPath)) {
    throw new Error("schema.sql was not found in the backend folder.");
}

const schema = fs.readFileSync(schemaPath, "utf8");

db.exec(schema);

// Insert sample data only if the table is empty.
const recordCount = db
    .prepare("SELECT COUNT(*) AS total FROM timetable")
    .get().total;

if (recordCount === 0) {
    const insert = db.prepare(`
        INSERT INTO timetable (
            course_code,
            course_name,
            day_of_week,
            start_time,
            end_time,
            venue,
            lecturer,
            notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleRecords = [
        [
            "ICT251",
            "Web Technologies I",
            "Monday",
            "08:00",
            "10:00",
            "Computer Laboratory 1",
            "ICT Lecturer",
            "HTML, CSS and JavaScript"
        ],
        [
            "ICT221",
            "Computer Architecture",
            "Monday",
            "10:30",
            "12:30",
            "Lecture Room 2",
            "ICT Lecturer",
            "Computer hardware and architecture"
        ],
        [
            "MSM111",
            "Mathematical Methods I",
            "Tuesday",
            "08:00",
            "10:00",
            "Lecture Room 3",
            "Mathematics Lecturer",
            "Practice mathematical problems"
        ],
        [
            "ICT261",
            "Object-Oriented Programming",
            "Tuesday",
            "10:30",
            "12:30",
            "Computer Laboratory 2",
            "Programming Lecturer",
            "Java programming practice"
        ],
        [
            "ICT281",
            "Statistics and Empirical Computing",
            "Wednesday",
            "08:00",
            "10:00",
            "Lecture Room 1",
            "Statistics Lecturer",
            "Review statistical methods"
        ],
        [
            "ICT241",
            "Digital Design",
            "Wednesday",
            "10:30",
            "12:30",
            "Computer Laboratory 1",
            "ICT Lecturer",
            "Digital logic exercises"
        ],
        [
            "BCS152",
            "Communication and Study Skills II",
            "Thursday",
            "08:00",
            "10:00",
            "Lecture Room 4",
            "Communication Lecturer",
            "Prepare class notes"
        ],
        [
            "ICT102",
            "Data Structures and Algorithms I",
            "Thursday",
            "10:30",
            "12:30",
            "Computer Laboratory 2",
            "Programming Lecturer",
            "Practice algorithms"
        ],
        [
            "PHY102",
            "Introduction to Physics II",
            "Friday",
            "08:00",
            "10:00",
            "Physics Laboratory",
            "Physics Lecturer",
            "Review physics concepts"
        ],
        [
            "ICT122",
            "Intermediate Programming",
            "Friday",
            "10:30",
            "12:30",
            "Computer Laboratory 1",
            "Programming Lecturer",
            "Complete programming exercises"
        ]
    ];

    const insertSamples = db.transaction((records) => {
        for (const record of records) {
            insert.run(...record);
        }
    });

    insertSamples(sampleRecords);

    console.log("Ten sample timetable records inserted.");
}

console.log("SQLite database connected successfully.");

module.exports = db;