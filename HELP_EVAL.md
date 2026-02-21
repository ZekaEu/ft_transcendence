## 650k de XP
docker exec trivia_mysql mysql -u triviauser -ptriviapass triviadb -e "UPDATE users SET xp=650000" 2>&1


## Todas as conquistas
docker exec trivia_mysql mysql -u triviauser -ptriviapass triviadb -e "
SET @uid = (SELECT id FROM users WHERE email='email@email.com' LIMIT 1);

-- Limpa dados de teste anteriores
DELETE FROM match_history WHERE room_name LIKE '_achv_%';
DELETE gp FROM game_room_players gp JOIN game_rooms gr ON gp.room_id=gr.id WHERE gr.name LIKE '_achv_%';
DELETE FROM game_rooms WHERE name LIKE '_achv_%';
DELETE FROM memory_game_rooms WHERE name LIKE '_achv_%';
DELETE FROM friendships WHERE friend_id IN (SELECT id FROM users WHERE email LIKE '_ab%@bot');
DELETE FROM users WHERE email LIKE '_ab%@bot';

-- XP 650k (cobre xp_100 ate xp_100000)
UPDATE users SET xp=650000 WHERE id=@uid;

-- 10 bots para amizades e multiplayer
INSERT INTO users (username,email,password_hash) VALUES
('_ab1','_ab1@bot','!'),('_ab2','_ab2@bot','!'),('_ab3','_ab3@bot','!'),
('_ab4','_ab4@bot','!'),('_ab5','_ab5@bot','!'),('_ab6','_ab6@bot','!'),
('_ab7','_ab7@bot','!'),('_ab8','_ab8@bot','!'),('_ab9','_ab9@bot','!'),
('_ab10','_ab10@bot','!');

-- 10 amizades (cobre first_friend, friends_5, friends_10)
INSERT INTO friendships (user_id,friend_id,status)
SELECT @uid,id,'accepted' FROM users WHERE email LIKE '_ab%@bot';

-- 10 game_rooms como host (cobre first_room, rooms_5, rooms_10)
INSERT INTO game_rooms (name,host_id,game_mode,status,max_players)
SELECT CONCAT('_achv_',n),@uid,'classic','finished',8
FROM (SELECT a.n+b.n*10+1 AS n
      FROM (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
            UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
            UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
     ) nums WHERE n<=10;

-- 100 match_history como vencedor (cobre first_game..games_100 + first_win..wins_25)
INSERT INTO match_history (user_id, game_type, room_id, room_name, score, is_winner, total_players, \`rank\`)
SELECT @uid, 'trivia', n, CONCAT('_achv_',n), 1000, TRUE, 2, 1
FROM (SELECT a.n+b.n*10+1 AS n
      FROM (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
            UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
            UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
     ) nums WHERE n<=100;

-- 1 partida com 3+ jogadores (cobre play_3_plus)
UPDATE match_history SET total_players=3
WHERE user_id=@uid AND room_name='_achv_1' LIMIT 1;

-- 1 partida com 5+ jogadores (cobre play_5_plus)
UPDATE match_history SET total_players=5
WHERE user_id=@uid AND room_name='_achv_2' LIMIT 1;

SELECT CONCAT(COUNT(*),' registros match_history') AS resultado
FROM match_history WHERE user_id=@uid;
" 2>&1

## Ranking com XP aleatorio
docker exec trivia_mysql mysql -u triviauser -ptriviapass triviadb -e "
UPDATE users SET xp = FLOOR(RAND() * 50000) + 100 WHERE email LIKE '_ab%@bot';
SELECT username, xp FROM users ORDER BY xp DESC;
" 2>&1
