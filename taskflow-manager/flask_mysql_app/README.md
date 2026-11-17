# TaskFlow — Python Flask + MySQL Task Management Application

## Folder Structure

```
flask_mysql_app/
├── app.py
├── requirements.txt
├── schema.sql
├── README.md
├── templates/
│   ├── login.html
│   ├── register.html
│   └── dashboard.html
└── static/
    ├── css/
    │   └── style.css
    └── js/
        └── app.js
```

## Setup & Execution Steps

1. **Create MySQL Database & Tables**
   ```bash
   mysql -u root -p < schema.sql
   ```

2. **Create & Activate Virtual Environment**
   ```bash
   cd flask_mysql_app
   python -m venv venv
   # Windows: venv\Scripts\activate
   # macOS/Linux: source venv/bin/activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables** (optional `.env` file)
   ```env
   FLASK_SECRET_KEY=replace-with-a-long-random-secret
   MYSQL_HOST=localhost
   MYSQL_USER=root
   MYSQL_PASSWORD=your_mysql_password
   MYSQL_DATABASE=task_manager_db
   ```

5. **Run the Application**
   ```bash
   python app.py
   ```
   Open `http://127.0.0.1:5000` in your browser.
