import os
from datetime import date
from functools import wraps

import mysql.connector
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "change-this-secret-key-in-production")


def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database=os.getenv("MYSQL_DATABASE", "task_manager_db"),
    )


def login_required(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            if request.path.startswith("/api/"):
                return jsonify({"error": "Authentication required."}), 401
            return redirect(url_for("login"))
        return view_func(*args, **kwargs)

    return wrapped


@app.route("/")
def index():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return redirect(url_for("login"))


@app.route("/register", methods=["GET", "POST"])
def register():
    if "user_id" in session:
        return redirect(url_for("dashboard"))

    error = None
    if request.method == "POST":
        full_name = request.form.get("full_name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")

        if len(full_name) < 2:
            error = "Full name must be at least 2 characters."
        elif "@" not in email or "." not in email:
            error = "Please enter a valid email address."
        elif len(password) < 6:
            error = "Password must be at least 6 characters."
        elif password != confirm_password:
            error = "Passwords do not match."
        else:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            try:
                cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
                if cursor.fetchone():
                    error = "An account with this email already exists."
                else:
                    pw_hash = generate_password_hash(password)
                    cursor.execute(
                        "INSERT INTO users (full_name, email, password_hash) VALUES (%s, %s, %s)",
                        (full_name, email, pw_hash),
                    )
                    conn.commit()
                    session["user_id"] = cursor.lastrowid
                    session["user_name"] = full_name
                    session["user_email"] = email
                    return redirect(url_for("dashboard"))
            finally:
                cursor.close()
                conn.close()

    return render_template("register.html", error=error)


@app.route("/login", methods=["GET", "POST"])
def login():
    if "user_id" in session:
        return redirect(url_for("dashboard"))

    error = None
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()
            if not user or not check_password_hash(user["password_hash"], password):
                error = "Invalid email or password."
            else:
                session["user_id"] = user["id"]
                session["user_name"] = user["full_name"]
                session["user_email"] = user["email"]
                return redirect(url_for("dashboard"))
        finally:
            cursor.close()
            conn.close()

    return render_template("login.html", error=error)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/dashboard")
@login_required
def dashboard():
    return render_template(
        "dashboard.html",
        user_name=session.get("user_name", "User"),
        user_email=session.get("user_email", ""),
        today_date=date.today().isoformat(),
    )


def _fetch_user_tasks_and_stats(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT id, title, description, DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date,
                   priority, status, created_at
            FROM tasks
            WHERE user_id = %s
            ORDER BY due_date ASC, id DESC
            """,
            (user_id,),
        )
        tasks = cursor.fetchall()
        today_str = date.today().isoformat()
        stats = {
            "total": len(tasks),
            "pending": sum(1 for t in tasks if t["status"] == "Pending"),
            "in_progress": sum(1 for t in tasks if t["status"] == "In Progress"),
            "completed": sum(1 for t in tasks if t["status"] == "Completed"),
            "today": sum(1 for t in tasks if t["due_date"] == today_str),
        }
        return tasks, stats, today_str
    finally:
        cursor.close()
        conn.close()


@app.route("/api/tasks", methods=["GET"])
@login_required
def get_tasks():
    tasks, stats, today_str = _fetch_user_tasks_and_stats(session["user_id"])
    return jsonify({"tasks": tasks, "stats": stats, "today_date": today_str})


@app.route("/api/tasks", methods=["POST"])
@login_required
def create_task():
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    description = str(data.get("description", "")).strip()
    due_date = str(data.get("due_date", "")).strip()
    priority = data.get("priority", "Medium")
    status = data.get("status", "Pending")

    if not title:
        return jsonify({"error": "Task title is required."}), 400
    if not due_date:
        return jsonify({"error": "Due date is required."}), 400
    if priority not in ("Low", "Medium", "High"):
        return jsonify({"error": "Invalid priority value."}), 400
    if status not in ("Pending", "In Progress", "Completed"):
        return jsonify({"error": "Invalid status value."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO tasks (user_id, title, description, due_date, priority, status)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (session["user_id"], title, description, due_date, priority, status),
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()

    tasks, stats, _ = _fetch_user_tasks_and_stats(session["user_id"])
    return jsonify({"tasks": tasks, "stats": stats}), 201


@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
@login_required
def update_task(task_id):
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    description = str(data.get("description", "")).strip()
    due_date = str(data.get("due_date", "")).strip()
    priority = data.get("priority", "Medium")
    status = data.get("status", "Pending")

    if not title or not due_date:
        return jsonify({"error": "Title and due date are required."}), 400
    if priority not in ("Low", "Medium", "High") or status not in (
        "Pending",
        "In Progress",
        "Completed",
    ):
        return jsonify({"error": "Invalid priority or status value."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE tasks
            SET title = %s, description = %s, due_date = %s, priority = %s, status = %s
            WHERE id = %s AND user_id = %s
            """,
            (title, description, due_date, priority, status, task_id, session["user_id"]),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Task not found."}), 404
    finally:
        cursor.close()
        conn.close()

    tasks, stats, _ = _fetch_user_tasks_and_stats(session["user_id"])
    return jsonify({"tasks": tasks, "stats": stats})


@app.route("/api/tasks/<int:task_id>/complete", methods=["PATCH"])
@login_required
def toggle_complete(task_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT status FROM tasks WHERE id = %s AND user_id = %s",
            (task_id, session["user_id"]),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Task not found."}), 404

        next_status = "Pending" if row["status"] == "Completed" else "Completed"
        cursor.execute(
            "UPDATE tasks SET status = %s WHERE id = %s AND user_id = %s",
            (next_status, task_id, session["user_id"]),
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()

    tasks, stats, _ = _fetch_user_tasks_and_stats(session["user_id"])
    return jsonify({"tasks": tasks, "stats": stats})


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
@login_required
def delete_task(task_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM tasks WHERE id = %s AND user_id = %s",
            (task_id, session["user_id"]),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Task not found."}), 404
    finally:
        cursor.close()
        conn.close()

    tasks, stats, _ = _fetch_user_tasks_and_stats(session["user_id"])
    return jsonify({"tasks": tasks, "stats": stats})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
