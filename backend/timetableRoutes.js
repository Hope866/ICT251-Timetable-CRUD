const express = require('express');
const router = express.Router();
const db = require('./db');

// Validate timetable information
function validateTimetable(data) {
    const requiredFields = [
        'course_code',
        'course_name',
        'day_of_week',
        'start_time',
        'end_time',
        'venue'
    ];

    for (const field of requiredFields) {
        if (
            typeof data[field] !== 'string' ||
            data[field].trim() === ''
        ) {
            return `${field} is required.`;
        }
    }

    const validDays = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday'
    ];

    if (!validDays.includes(data.day_of_week)) {
        return 'Please select a valid day of the week.';
    }

    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

    if (
        !timePattern.test(data.start_time) ||
        !timePattern.test(data.end_time)
    ) {
        return 'Time must use the HH:MM format.';
    }

    if (data.end_time <= data.start_time) {
        return 'End time must be later than start time.';
    }

    return null;
}

// Prepare data before saving it
function prepareData(data) {
    return {
        course_code: data.course_code.trim(),
        course_name: data.course_name.trim(),
        day_of_week: data.day_of_week,
        start_time: data.start_time,
        end_time: data.end_time,
        venue: data.venue.trim(),
        lecturer: typeof data.lecturer === 'string'
            ? data.lecturer.trim()
            : '',
        notes: typeof data.notes === 'string'
            ? data.notes.trim()
            : ''
    };
}

// 1. GET ALL TIMETABLE RECORDS
router.get('/', (req, res) => {
    try {
        const records = db.prepare(
            'SELECT * FROM timetable ORDER BY id ASC'
        ).all();

        res.status(200).json({
            success: true,
            count: records.length,
            data: records
        });
    } catch (error) {
        console.error('GET timetable error:', error);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve timetable records.'
        });
    }
});

// 2. GET ONE TIMETABLE RECORD
router.get('/:id', (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid record ID.'
            });
        }

        const record = db.prepare(
            'SELECT * FROM timetable WHERE id = ?'
        ).get(id);

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Timetable record not found.'
            });
        }

        res.status(200).json({
            success: true,
            data: record
        });
    } catch (error) {
        console.error('GET timetable record error:', error);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve the timetable record.'
        });
    }
});

// 3. CREATE A TIMETABLE RECORD
router.post('/', (req, res) => {
    try {
        const validationError = validateTimetable(req.body);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        const data = prepareData(req.body);

        const result = db.prepare(`
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
        `).run(
            data.course_code,
            data.course_name,
            data.day_of_week,
            data.start_time,
            data.end_time,
            data.venue,
            data.lecturer,
            data.notes
        );

        const newRecord = db.prepare(
            'SELECT * FROM timetable WHERE id = ?'
        ).get(result.lastInsertRowid);

        res.status(201).json({
            success: true,
            message: 'Timetable record created successfully.',
            data: newRecord
        });
    } catch (error) {
        console.error('POST timetable error:', error);

        res.status(500).json({
            success: false,
            message: 'Could not create the timetable record.'
        });
    }
});

// 4. UPDATE A TIMETABLE RECORD
router.put('/:id', (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid record ID.'
            });
        }

        const existingRecord = db.prepare(
            'SELECT * FROM timetable WHERE id = ?'
        ).get(id);

        if (!existingRecord) {
            return res.status(404).json({
                success: false,
                message: 'Timetable record not found.'
            });
        }

        const validationError = validateTimetable(req.body);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        const data = prepareData(req.body);

        db.prepare(`
            UPDATE timetable
            SET course_code = ?,
                course_name = ?,
                day_of_week = ?,
                start_time = ?,
                end_time = ?,
                venue = ?,
                lecturer = ?,
                notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            data.course_code,
            data.course_name,
            data.day_of_week,
            data.start_time,
            data.end_time,
            data.venue,
            data.lecturer,
            data.notes,
            id
        );

        const updatedRecord = db.prepare(
            'SELECT * FROM timetable WHERE id = ?'
        ).get(id);

        res.status(200).json({
            success: true,
            message: 'Timetable record updated successfully.',
            data: updatedRecord
        });
    } catch (error) {
        console.error('PUT timetable error:', error);

        res.status(500).json({
            success: false,
            message: 'Could not update the timetable record.'
        });
    }
});

// 5. DELETE A TIMETABLE RECORD
router.delete('/:id', (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid record ID.'
            });
        }

        const result = db.prepare(
            'DELETE FROM timetable WHERE id = ?'
        ).run(id);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Timetable record not found.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Timetable record deleted successfully.'
        });
    } catch (error) {
        console.error('DELETE timetable error:', error);

        res.status(500).json({
            success: false,
            message: 'Could not delete the timetable record.'
        });
    }
});

// IMPORTANT: Export the router so server.js can use it.
module.exports = router;