-- =============================================
-- Triple Trouble Trivia – Database Schema
-- =============================================

CREATE DATABASE IF NOT EXISTS triviadb
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE triviadb;

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


-- ─────────────────────────────────────────────
-- Chat rooms (DM or group)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_rooms (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(128)    NULL,
    is_group    BOOLEAN         NOT NULL DEFAULT FALSE,
    created_by  INT             NULL,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_chatroom_creator
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────
-- Chat room members (many-to-many)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_room_members (
    room_id     INT     NOT NULL,
    user_id     INT     NOT NULL,
    joined_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (room_id, user_id),

    CONSTRAINT fk_crm_room
        FOREIGN KEY (room_id) REFERENCES chat_rooms(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_crm_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────
-- Chat messages
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    room_id     INT             NOT NULL,
    sender_id   INT             NOT NULL,
    content     TEXT            NOT NULL,
    is_system   BOOLEAN         NOT NULL DEFAULT FALSE,
    is_read     BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_chatmsg_room
        FOREIGN KEY (room_id) REFERENCES chat_rooms(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_chatmsg_sender
        FOREIGN KEY (sender_id) REFERENCES users(id)
        ON DELETE CASCADE,

    INDEX idx_chatmsg_room (room_id),
    INDEX idx_chatmsg_sender (sender_id),
    INDEX idx_chatmsg_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────
-- Game rooms
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_rooms (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(128)    NOT NULL,
    host_id     INT             NOT NULL,
    game_mode   VARCHAR(32)     NOT NULL DEFAULT 'classic',
    max_players INT             NOT NULL DEFAULT 4,
    friends_only BOOLEAN        NOT NULL DEFAULT FALSE,
    status      VARCHAR(20)     NOT NULL DEFAULT 'waiting',
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_gameroom_host
        FOREIGN KEY (host_id) REFERENCES users(id)
        ON DELETE CASCADE,

    INDEX idx_gameroom_status (status),
    INDEX idx_gameroom_mode (game_mode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────
-- Game room players
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_room_players (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    room_id     INT             NOT NULL,
    user_id     INT             NOT NULL,
    is_ready    BOOLEAN         NOT NULL DEFAULT FALSE,
    score       INT             NOT NULL DEFAULT 0,
    joined_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_grp_room
        FOREIGN KEY (room_id) REFERENCES game_rooms(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_grp_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_room_player
        UNIQUE (room_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────
-- Friendships
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friendships (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT             NOT NULL,
    friend_id   INT             NOT NULL,
    status      VARCHAR(20)     NOT NULL DEFAULT 'pending',
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_friendship_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_friendship_friend
        FOREIGN KEY (friend_id) REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_friendship
        UNIQUE (user_id, friend_id),

    INDEX idx_friendship_user (user_id),
    INDEX idx_friendship_friend (friend_id),
    INDEX idx_friendship_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
