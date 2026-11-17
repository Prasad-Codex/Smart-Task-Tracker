-- Create the database
CREATE DATABASE IF NOT EXISTS task_manager_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE task_manager_db;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table linked to each user
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
  status ENUM('Pending', 'In Progress', 'Completed') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- Helpful index for fast dashboard filtering
CREATE INDEX idx_tasks_user_due ON tasks (user_id, due_date);
