-- =============================================
-- Triple Trouble Trivia – Database Schema
-- =============================================

CREATE DATABASE IF NOT EXISTS trivia_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE trivia_db;

-- ─────────────────────────────────────────────
-- Users table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(64)     NOT NULL UNIQUE,
    email           VARCHAR(120)    NOT NULL UNIQUE,
    password_hash   VARCHAR(256)    NULL,
    avatar_url      VARCHAR(512)    NULL,
    display_name    VARCHAR(128)    NULL,
    bio             VARCHAR(500)    NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    is_online       BOOLEAN         NOT NULL DEFAULT FALSE,
    last_seen       DATETIME        NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_users_username (username),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────
-- OAuth accounts (42, Google, GitHub, etc.)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT             NOT NULL,
    provider            VARCHAR(50)     NOT NULL,
    provider_user_id    VARCHAR(128)    NOT NULL,
    access_token        VARCHAR(512)    NULL,
    refresh_token       VARCHAR(512)    NULL,
    token_expires_at    DATETIME        NULL,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_oauth_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_provider_user
        UNIQUE (provider, provider_user_id),

    INDEX idx_oauth_provider (provider, provider_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────
-- Revoked JWT tokens (blocklist)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revoked_tokens (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    jti         VARCHAR(120)    NOT NULL UNIQUE,
    user_id     INT             NOT NULL,
    revoked_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_revoked_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    INDEX idx_revoked_jti (jti)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
