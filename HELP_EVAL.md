docker exec trivia_mysql mysql -u triviauser -ptriviapass triviadb -e "UPDATE users SET xp=650000" 2>&1

docker exec trivia_mysql mysql -u triviauser -ptriviapass triviadb -e "
SET @uid = (SELECT id FROM users WHERE email='email@email.com' LIMIT 1);

-- Limpa dados de teste anteriores
DELETE gp FROM game_room_players gp JOIN game_rooms gr ON gp.room_id=gr.id WHERE gr.name LIKE '_achv_%';
DELETE FROM game_rooms WHERE name LIKE '_achv_%';
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

-- 100 salas finalizadas como host (cobre first_room, rooms_5, rooms_10)
INSERT INTO game_rooms (name,host_id,game_mode,status,max_players)
SELECT CONCAT('_achv_',n),@uid,'classic','finished',8
FROM (SELECT a.n+b.n*10+1 AS n
      FROM (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
            UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
            UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
     ) nums WHERE n<=100;

-- Jogador com score maximo em todas (cobre first_game..games_100 + first_win..wins_25)
INSERT INTO game_room_players (room_id,user_id,score,is_ready)
SELECT id,@uid,1000,1 FROM game_rooms WHERE name LIKE '_achv_%';

-- 5 bots na primeira sala (cobre play_3_plus e play_5_plus)
SET @rid=(SELECT MIN(id) FROM game_rooms WHERE name LIKE '_achv_%');
INSERT INTO game_room_players (room_id,user_id,score,is_ready)
SELECT @rid,id,50,1 FROM users WHERE email LIKE '_ab%@bot' LIMIT 5;

SELECT CONCAT(COUNT(*),' conquistas prontas') AS resultado
FROM game_room_players WHERE user_id=@uid;
" 2>&1

docker exec trivia_mysql mysql -u triviauser -ptriviapass triviadb -e "
UPDATE users SET xp = FLOOR(RAND() * 50000) + 100 WHERE email LIKE '_ab%@bot';
SELECT username, xp FROM users ORDER BY xp DESC;
" 2>&1

email@email.com
