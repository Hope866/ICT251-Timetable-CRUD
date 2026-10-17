"use strict";

// The dashboard and API are served from the same Express server.
const API_URL = "/api/timetable";

const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
];

const DAY_ORDER = Object.fromEntries(
    DAYS.map((day, index) => [day, index])
);

// HTML elements.
const timetableBody = document.getElementById("timetable-body");

const timetableForm = document.getElementById("timetable-form");

const entryIdInput = document.getElementById("entry-id");

const courseCodeInput = document.getElementById("course-code");

const courseNameInput = document.getElementById("course-name");

const dayInput = document.getElementById("day-of-week");

const startTimeInput = document.getElementById("start-time");

const endTimeInput = document.getElementById("end-time");

const venueInput = document.getElementById("venue");

const lecturerInput = document.getElementById("lecturer");

const notesInput = document.getElementById("notes");

const searchInput = document.getElementById("search-input");

const formTitle = document.getElementById("form-title");

const saveButton = document.getElementById("save-button");

const cancelEditButton = document.getElementById("cancel-edit-button");

const clearButton = document.getElementById("clear-button");

const addEntryButton = document.getElementById("add-entry-button");

const totalClassesElement = document.getElementById("total-classes");

const activeDaysElement = document.getElementById("active-days");

const studyHoursElement = document.getElementById("study-hours");

const recordCountElement = document.getElementById("record-count");

const connectionDot = document.getElementById("connection-dot");

const connectionText = document.getElementById("connection-text");

const toastContainer = document.getElementById("toast-container");

const currentDateElement = document.getElementById("current-date");

// Application state.
let timetableRecords = [];

let isSaving = false;

// Escape text before inserting it into HTML.
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

// Show a temporary notification.
function showToast(message, type = "success") {
    const toast = document.createElement("div");

    toast.className = `toast ${type === "error" ? "error" : ""} ${type === "warning" ? "warning" : ""
        }`;

    toast.textContent = message;

    toastContainer.appendChild(toast);

    window.setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Update the server connection indicator.
function setConnectionStatus(isOnline) {
    connectionDot.classList.toggle("online", isOnline);

    connectionDot.classList.toggle("offline", !isOnline);

    connectionText.textContent = isOnline
        ? "Connected to database"
        : "Connection unavailable";
}

// Make API requests and handle errors consistently.
async function apiRequest(url, options = {}) {
    const requestOptions = {
        ...options,
        headers: {
            ...(options.body
                ? { "Content-Type": "application/json" }
                : {}),
            ...(options.headers || {})
        }
    };

    let response;

    try {
        response = await fetch(url, requestOptions);
    } catch (error) {
        setConnectionStatus(false);

        throw new Error(
            "Cannot connect to the server. Make sure the backend is running."
        );
    }

    let result;

    try {
        result = await response.json();
    } catch (error) {
        throw new Error("The server returned an invalid response.");
    }

    if (!response.ok) {
        throw new Error(
            result.message || `Request failed with status ${response.status}.`
        );
    }

    return result;
}

// Format time as a readable 12-hour clock.
function formatTime(time) {
    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
        return time || "—";
    }

    const [hours, minutes] = time.split(":").map(Number);

    const period = hours >= 12 ? "PM" : "AM";

    const displayHour = hours % 12 || 12;

    return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
}

// Convert class duration into hours.
function calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) {
        return 0;
    }

    const [startHour, startMinute] = startTime.split(":").map(Number);

    const [endHour, endMinute] = endTime.split(":").map(Number);

    const start = startHour * 60 + startMinute;

    const end = endHour * 60 + endMinute;

    return Math.max(0, end - start) / 60;
}

// Update the dashboard summary.
function updateSummary() {
    totalClassesElement.textContent = timetableRecords.length;

    const uniqueDays = new Set(
        timetableRecords.map((record) => record.day_of_week)
    );

    activeDaysElement.textContent = uniqueDays.size;

    const totalHours = timetableRecords.reduce((total, record) => {
        return total + calculateDuration(
            record.start_time,
            record.end_time
        );
    }, 0);

    studyHoursElement.textContent = totalHours.toFixed(1);
}

// Sort records by day and start time.
function sortRecords(records) {
    return [...records].sort((a, b) => {
        const dayA = DAY_ORDER[a.day_of_week] ?? 99;

        const dayB = DAY_ORDER[b.day_of_week] ?? 99;

        if (dayA !== dayB) {
            return dayA - dayB;
        }

        return a.start_time.localeCompare(b.start_time);
    });
}

// Search the loaded timetable records.
function getFilteredRecords() {
    const query = searchInput.value.trim().toLowerCase();

    const filtered = timetableRecords.filter((record) => {
        const searchableText = [
            record.course_code,
            record.course_name,
            record.day_of_week,
            record.venue,
            record.lecturer,
            record.notes
        ].join(" ").toLowerCase();

        return searchableText.includes(query);
    });

    return sortRecords(filtered);
}

// Display a message when no records are available.
function renderEmptyState(message, showAddButton = false) {
    timetableBody.innerHTML = `
        <tr>
            <td colspan="6">
                <div class="empty-state">
                    <div class="empty-state-icon">📅</div>

                    <h3>No timetable entries found</h3>

                    <p>${escapeHTML(message)}</p>

                    ${showAddButton
            ? `
                                <button
                                    type="button"
                                    class="btn btn-primary"
                                    id="empty-add-button"
                                >
                                    + Add your first entry
                                </button>
                            `
            : ""
        }
                </div>
            </td>
        </tr>
    `;

    const emptyAddButton = document.getElementById("empty-add-button");

    if (emptyAddButton) {
        emptyAddButton.addEventListener("click", showAddForm);
    }
}

// Render the timetable table.
function renderTimetable() {
    const records = getFilteredRecords();

    recordCountElement.textContent =
        `${records.length} of ${timetableRecords.length} record(s)`;

    if (records.length === 0) {
        const hasSearch = searchInput.value.trim() !== "";

        renderEmptyState(
            hasSearch
                ? "Try a different search term."
                : "Add a schedule entry to begin managing your timetable.",
            !hasSearch
        );

        return;
    }

    timetableBody.innerHTML = records.map((record) => `
        <tr>

            <td>
                <span class="course-code">
                    ${escapeHTML(record.course_code)}
                </span>
            </td>

            <td>
                <div class="course-name">
                    ${escapeHTML(record.course_name)}
                </div>

                ${record.notes
            ? `
                            <div class="course-notes">
                                ${escapeHTML(record.notes)}
                            </div>
                        `
            : ""
        }
            </td>

            <td>
                <span class="day-badge">
                    ${escapeHTML(record.day_of_week)}
                </span>
            </td>

            <td>
                <div class="time-text">
                    ${escapeHTML(formatTime(record.start_time))}
                </div>

                <div
                    style="
                        color: var(--muted);
                        font-size: 10px;
                        margin-top: 3px;
                    "
                >
                    to ${escapeHTML(formatTime(record.end_time))}
                </div>
            </td>

            <td>
                <div class="venue-text">
                    ${escapeHTML(record.venue)}
                </div>

                ${record.lecturer
            ? `
                            <div
                                style="
                                    color: var(--muted);
                                    font-size: 10px;
                                    margin-top: 4px;
                                "
                            >
                                ${escapeHTML(record.lecturer)}
                            </div>
                        `
            : ""
        }
            </td>

            <td>
                <div class="action-buttons">

                    <button
                        type="button"
                        class="btn btn-secondary btn-small"
                        data-action="edit"
                        data-id="${Number(record.id)}"
                        aria-label="Edit ${escapeHTML(record.course_code)}"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="btn btn-danger btn-small"
                        data-action="delete"
                        data-id="${Number(record.id)}"
                        aria-label="Delete ${escapeHTML(record.course_code)}"
                    >
                        Delete
                    </button>

                </div>
            </td>

        </tr>
    `).join("");
}

// Load all records from the API.
async function loadTimetable(showNotification = false) {
    timetableBody.innerHTML = `
        <tr>
            <td colspan="6">
                <div class="loading-row">
                    Loading timetable...
                </div>
            </td>
        </tr>
    `;

    try {
        const result = await apiRequest(API_URL);

        timetableRecords = Array.isArray(result.data)
            ? result.data
            : [];

        setConnectionStatus(true);

        updateSummary();

        renderTimetable();

        if (showNotification) {
            showToast("Timetable refreshed successfully.");
        }
    } catch (error) {
        timetableRecords = [];

        updateSummary();

        recordCountElement.textContent = "Unable to load records";

        renderEmptyState(error.message);

        setConnectionStatus(false);

        if (showNotification) {
            showToast(error.message, "error");
        }
    }
}

// Clear the form and return to add mode.
function resetForm() {
    timetableForm.reset();

    entryIdInput.value = "";

    formTitle.textContent = "Add a schedule entry";

    saveButton.textContent = "Save Schedule Entry";

    cancelEditButton.hidden = true;

    clearButton.textContent = "Clear Form";
}

// Display the form in add mode.
function showAddForm() {
    resetForm();

    document.getElementById("entry-form").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    window.setTimeout(() => {
        courseCodeInput.focus();
    }, 300);
}

// Load an existing record into the form.
async function editRecord(id) {
    try {
        const result = await apiRequest(`${API_URL}/${id}`);

        const record = result.data;

        if (!record) {
            throw new Error("Timetable record not found.");
        }

        entryIdInput.value = record.id;

        courseCodeInput.value = record.course_code || "";

        courseNameInput.value = record.course_name || "";

        dayInput.value = record.day_of_week || "";

        startTimeInput.value = record.start_time || "";

        endTimeInput.value = record.end_time || "";

        venueInput.value = record.venue || "";

        lecturerInput.value = record.lecturer || "";

        notesInput.value = record.notes || "";

        formTitle.textContent = "Edit schedule entry";

        saveButton.textContent = "Save Changes";

        cancelEditButton.hidden = false;

        document.getElementById("entry-form").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        courseCodeInput.focus();

        showToast("Entry loaded. Make your changes and save.");
    } catch (error) {
        showToast(error.message, "error");
    }
}

// Delete a timetable record.
async function deleteRecord(id) {
    const record = timetableRecords.find(
        (item) => Number(item.id) === Number(id)
    );

    if (!record) {
        showToast("This timetable entry could not be found.", "error");

        return;
    }

    const confirmed = window.confirm(
        `Are you sure you want to delete ${record.course_code} - ` +
        `${record.course_name}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
        return;
    }

    try {
        const result = await apiRequest(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        timetableRecords = timetableRecords.filter(
            (item) => Number(item.id) !== Number(id)
        );

        updateSummary();

        renderTimetable();

        setConnectionStatus(true);

        showToast(result.message || "Timetable entry deleted.");
    } catch (error) {
        showToast(error.message, "error");

        await loadTimetable();
    }
}

// Collect and validate form values.
function getFormData() {
    return {
        course_code: courseCodeInput.value.trim(),

        course_name: courseNameInput.value.trim(),

        day_of_week: dayInput.value,

        start_time: startTimeInput.value,

        end_time: endTimeInput.value,

        venue: venueInput.value.trim(),

        lecturer: lecturerInput.value.trim(),

        notes: notesInput.value.trim()
    };
}

// Handle adding and updating records.
timetableForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSaving) {
        return;
    }

    if (!timetableForm.reportValidity()) {
        return;
    }

    const data = getFormData();

    if (data.start_time >= data.end_time) {
        showToast(
            "End time must be later than start time.",
            "error"
        );

        endTimeInput.focus();

        return;
    }

    const id = entryIdInput.value;

    const isEditing = id !== "";

    const url = isEditing
        ? `${API_URL}/${id}`
        : API_URL;

    const method = isEditing ? "PUT" : "POST";

    isSaving = true;

    saveButton.disabled = true;

    saveButton.textContent = isEditing
        ? "Saving changes..."
        : "Adding entry...";

    try {
        const result = await apiRequest(url, {
            method,
            body: JSON.stringify(data)
        });

        resetForm();

        await loadTimetable();

        if (isEditing) {
            showToast(
                result.message || "Timetable entry updated successfully."
            );
        } else {
            showToast(
                result.message || "Timetable entry added successfully."
            );
        }

        document.getElementById("timetable-section").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    } catch (error) {
        showToast(error.message, "error");
    } finally {
        isSaving = false;

        saveButton.disabled = false;

        saveButton.textContent = entryIdInput.value
            ? "Save Changes"
            : "Save Schedule Entry";
    }
});

// Handle clicks on Edit and Delete buttons.
timetableBody.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const id = Number(button.dataset.id);

    if (!Number.isSafeInteger(id) || id < 1) {
        showToast("Invalid timetable record ID.", "error");

        return;
    }

    if (button.dataset.action === "edit") {
        await editRecord(id);
    }

    if (button.dataset.action === "delete") {
        await deleteRecord(id);
    }
});

// Search records as the user types.
searchInput.addEventListener("input", () => {
    renderTimetable();
});

// Open the form using the main Add button.
addEntryButton.addEventListener("click", showAddForm);

// Cancel editing and return to add mode.
cancelEditButton.addEventListener("click", () => {
    resetForm();

    showToast("Editing cancelled.");
});

// Reset the form.
clearButton.addEventListener("click", () => {
    window.setTimeout(() => {
        resetForm();
    }, 0);
});

// Display the current date.
function displayCurrentDate() {
    const now = new Date();

    currentDateElement.textContent = now.toLocaleDateString(
        "en-GB",
        {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );
}

// Initialize the dashboard.
displayCurrentDate();

loadTimetable();