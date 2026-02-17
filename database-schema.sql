-- Create Database
CREATE DATABASE IF NOT EXISTS phone_news_db;
USE phone_news_db;

-- Articles Table
CREATE TABLE articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    meta_description VARCHAR(300),
    excerpt TEXT,
    category VARCHAR(50) NOT NULL,
    featured_image VARCHAR(255),
    source_url VARCHAR(500),
    focus_keyword VARCHAR(100),
    views INT DEFAULT 0,
    status ENUM('draft', 'published', 'scheduled') DEFAULT 'draft',
    published_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    author_id INT,
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_published (published_at),
    FULLTEXT INDEX idx_search (title, content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Categories Table
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Authors Table
CREATE TABLE authors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- News Sources Tracking
CREATE TABLE news_sources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    original_url VARCHAR(500) UNIQUE NOT NULL,
    original_title VARCHAR(255),
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    article_id INT,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Automation Logs
CREATE TABLE automation_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    action VARCHAR(50) NOT NULL,
    status ENUM('success', 'failed', 'pending') DEFAULT 'pending',
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert Default Categories
INSERT INTO categories (name, slug, description) VALUES
('Mobile News', 'mobile-news', 'Latest smartphone launches'),
('Android Updates', 'android-updates', 'Android OS updates'),
('iPhone News', 'iphone-news', 'iPhone and iOS updates'),
('Reviews', 'reviews', 'Phone reviews'),
('Comparisons', 'comparisons', 'Phone comparisons'),
('Guides', 'guides', 'How-to guides');

-- Insert Default Author
INSERT INTO authors (name, email, bio) VALUES
('Tech Editor', 'editor@phoneverse.com', 'Tech journalist covering mobile technology');