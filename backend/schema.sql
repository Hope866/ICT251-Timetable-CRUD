CREATE TABLE IF NOT EXISTS timetable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    course_code TEXT NOT NULL,

    course_name TEXT NOT NULL,

    day_of_week TEXT NOT NULL,

    start_time TEXT NOT NULL,

    end_time TEXT NOT NULL,

    venue TEXT NOT NULL,

    lecturer TEXT DEFAULT '',

    notes TEXT DEFAULT '',

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);