const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./db');
const app = express();
const PORT = 3000;  

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configure session
app.use(session({
    secret: 'abcdef',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set true if using HTTPS
}));

// Register route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
        db.query(query, [username, hashedPassword], (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Error registering user', error: err });
            } else {
                return res.status(200).json({ message: 'Registration successful' });
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error });
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const query = 'SELECT * FROM users WHERE username = ?';
        db.query(query, [username], async (err, results) => {
            if (err || results.length === 0) {
                return res.status(400).json({ message: 'Invalid username or password' });
            } else {
                const user = results[0];
                const match = await bcrypt.compare(password, user.password);

                if (match) {
                    req.session.username = username;  // Store username in session
                    
                    return res.status(200).json({ message: 'Login successful', username: user.username });
                } else {
                    return res.status(400).json({ message: 'Invalid username or password' });
                }
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error });
    }
});

// 메모 추가 API
app.post('/add-note', (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ message: '로그인이 필요합니다' });
    }

    const { title, contents } = req.body;
    const query = 'SELECT id FROM users WHERE username = ?';
    
    db.query(query, [req.session.username], (err, results) => {
        if (err || results.length === 0) {
            return res.status(500).json({ message: 'User not found' });
        }

        const userId = results[0].id;
        const insertQuery = 'INSERT INTO notes (user_id, title, contents) VALUES (?, ?, ?)';
        
        db.query(insertQuery, [userId, title, contents], (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Error adding note', error: err });
            }
            return res.status(200).json({ message: 'Note added successfully' });
        });
    });
});

// 메모 조회 API
app.get('/get-notes', (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ message: '로그인이 필요합니다' });
    }

    const query = 'SELECT notes.id, notes.title, notes.contents, notes.created_at FROM notes INNER JOIN users ON notes.user_id = users.id WHERE users.username = ?';

    db.query(query, [req.session.username], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error fetching notes', error: err });
        }
        res.status(200).json(results);
    });
});

// 메모 삭제 API
app.delete('/delete-note/:id', (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ message: '로그인이 필요합니다' });
    }
    
    const noteId = req.params.id;
    const deleteQuery = 'DELETE FROM notes WHERE id = ?';

    db.query(deleteQuery, [noteId], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error deleting note', error: err });
        }
        res.status(200).json({ message: 'Note deleted successfully' });
    });
});

// 메모 수정 API
app.put('/update-notes/:id', (req, res) => {
    const memo_id = req.params.id;
    const { title, content } = req.body;
    const query = 'UPDATE notes SET title = ?, contents = ? WHERE id = ?';

    db.query(query, [title, content, memo_id], (err, result) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.status(200).send({ message: 'notes updated successfully!' });
      }
    });
  });

// 날짜와 몸무게 저장/수정 API
app.post('/save-weight', (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    const { date, weight } = req.body;

    // 날짜와 사용자 이름을 통해 사용자 ID 조회
    const query = 'SELECT id FROM users WHERE username = ?';

    db.query(query, [req.session.username], (err, results) => {
        if (err || results.length === 0) {
            console.error(err || 'User not found');
            return res.status(500).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        const userId = results[0].id; // 조회된 user_id

        // 해당 날짜와 user_id에 대한 데이터가 있는지 확인
        const checkQuery = 'SELECT * FROM DateWeight WHERE user_id = ? AND date = ?';

        db.query(checkQuery, [userId, date], (err, checkResults) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: '데이터 조회 중 오류가 발생했습니다.', error: err });
            }

            if (checkResults.length > 0) {
                // 데이터가 이미 존재하면 UPDATE
                const updateQuery = 'UPDATE DateWeight SET weight = ? WHERE user_id = ? AND date = ?';
                db.query(updateQuery, [weight, userId, date], (err, result) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ message: '데이터 수정 중 오류가 발생했습니다.', error: err });
                    }
                    return res.status(200).json({ message: '체중 업데이트 성공' });
                });
            } else {
                // 데이터가 없으면 INSERT
                const insertQuery = 'INSERT INTO DateWeight (user_id, date, weight) VALUES (?, ?, ?)';
                db.query(insertQuery, [userId, date, weight], (err, result) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ message: '데이터 저장 중 오류가 발생했습니다.', error: err });
                    }
                    return res.status(200).json({ message: '저장 성공' });
                });
            }
        });
    });
});



// 날짜와 몸무게 저장 API
app.post('/save-weight', (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    const { date, weight } = req.body;
    
    const query = 'SELECT id FROM users WHERE username = ? ';

    // username을 통해 userId를 조회
    db.query(query, [req.session.username], (err, results) => {
        if (err || results.length === 0) {
            console.error(err || 'User not found');
            return res.status(500).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        const userId = results[0].id; // 조회된 user_id
        const insertQuery = `INSERT INTO DateWeight (user_id, date, weight) VALUES (?, ?, ?)`;

        // userId를 사용해 DateWeight 테이블에 삽입
        db.query(insertQuery, [userId, date, weight], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: '데이터 저장 중 오류가 발생했습니다.', error: err });
            }
            return res.status(200).json({ message: '저장 성공' });
        });
    });
});

// 날짜별 몸무게와 목표 대비 차이 조회
app.get('/get-weight', (req, res) => {
    const { date } = req.query; // 클라이언트에서 날짜 전달받음
    const username = req.session.username; // 세션에서 사용자명 가져오기

    if (!username) {
        return res.status(401).json({ error: '로그인 필요' });
    }

    // 사용자 ID와 목표 몸무게 조회
    const getUserInfoQuery = 'SELECT id, target_weight FROM users WHERE username = ?';
    db.query(getUserInfoQuery, [username], (err, userResults) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: '사용자 정보 조회 실패' });
        }

        if (userResults.length === 0) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
        }

        const { id: userId, target_weight: targetWeight } = userResults[0];

        // 날짜별 몸무게 조회
        const getWeightQuery = 'SELECT weight FROM DateWeight WHERE user_id = ? AND date = ?';
        db.query(getWeightQuery, [userId, date], (err, weightResults) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: '날짜별 데이터 조회 실패' });
            }

            const currentWeight = weightResults.length > 0 ? weightResults[0].weight : null;

            // 목표 대비 차이 계산
            const weightDifference = currentWeight !== null ? currentWeight - targetWeight : null;

            res.json({
                targetWeight,
                currentWeight, // 데이터가 없을 경우 null 반환
                weightDifference, // 데이터가 없을 경우 null 반환
            });
        });
    });
});

// Session username route
app.get('/session-username', (req, res) => {
    if (req.session.username) {
        res.json({ username: req.session.username });
    } else {
        res.status(401).json({ message: '로그인이 필요합니다' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
