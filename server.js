
const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Database(path.join(__dirname, "students.db"));

db.exec(`
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        course TEXT NOT NULL,
        marks REAL NOT NULL DEFAULT 0
    )
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/students", (req, res) => {
    const students = db.prepare(
        "SELECT * FROM students ORDER BY id DESC"
    ).all();

    res.json(students);
});

app.post("/api/students", (req, res) => {
    const { name, email, course, marks } = req.body;

    if (
        typeof name !== "string" || !name.trim() ||
        typeof email !== "string" || !email.trim() ||
        typeof course !== "string" || !course.trim() ||
        marks === "" || marks === undefined ||
        !Number.isFinite(Number(marks)) ||
        Number(marks) < 0 || Number(marks) > 100
    ) {
        return res.status(400).json({
            error: "Enter valid student details and marks from 0 to 100."
        });
    }

    try {
        const result = db.prepare(`
            INSERT INTO students (name, email, course, marks)
            VALUES (?, ?, ?, ?)
        `).run(name.trim(), email.trim(), course.trim(), Number(marks));

        const student = db.prepare(
            "SELECT * FROM students WHERE id = ?"
        ).get(result.lastInsertRowid);

        res.status(201).json(student);
    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                error: "This email is already registered."
            });
        }

        res.status(500).json({ error: "Unable to add student." });
    }
});

app.put("/api/students/:id", (req, res) => {
    const { name, email, course, marks } = req.body;
    const id = Number(req.params.id);

    if (
        !Number.isInteger(id) || id < 1 ||
        typeof name !== "string" || !name.trim() ||
        typeof email !== "string" || !email.trim() ||
        typeof course !== "string" || !course.trim() ||
        marks === "" || marks === undefined ||
        !Number.isFinite(Number(marks)) ||
        Number(marks) < 0 || Number(marks) > 100
    ) {
        return res.status(400).json({
            error: "Enter valid student details and marks from 0 to 100."
        });
    }

    try {
        const result = db.prepare(`
            UPDATE students
            SET name = ?, email = ?, course = ?, marks = ?
            WHERE id = ?
        `).run(name.trim(), email.trim(), course.trim(), Number(marks), id);

        if (!result.changes) {
            return res.status(404).json({ error: "Student not found." });
        }

        res.json(db.prepare(
            "SELECT * FROM students WHERE id = ?"
        ).get(id));
    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                error: "This email is already registered."
            });
        }

        res.status(500).json({ error: "Unable to update student." });
    }
});

app.delete("/api/students/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: "Invalid student ID." });
    }

    const result = db.prepare(
        "DELETE FROM students WHERE id = ?"
    ).run(id);

    if (!result.changes) {
        return res.status(404).json({ error: "Student not found." });
    }

    res.json({ message: "Student deleted successfully." });
});

app.listen(PORT, () => {
    console.log(`Student Management System: http://localhost:${PORT}`);
});
