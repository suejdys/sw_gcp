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
                console.error('Error during INSERT query:', err); // 메모 추가 오류 로그
                return res.status(500).json({ message: 'Error adding note', error: err });
                
            }
            return res.status(200).json({ message: '추가 완료' });
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
        res.status(200).json({ message: '삭제 완료' });
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
        res.status(200).send({ message: '수정 완료' });
      }
    });
  });

// 목표 몸무게 설정 API
app.post("/save-target-weight", (req, res) => {
  if (!req.session.username) {
    return res.status(401).json({ message: "로그인이 필요합니다" });
  }

  const { targetWeight } = req.body;
  if (!targetWeight) {
    return res.status(400).json({ message: "Invalid target weight" });
  }

  const query = "UPDATE users SET target_weight = ? WHERE username = ?";
  db.query(query, [targetWeight, req.session.username], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error updating target weight", error: err });
    }

    res.status(200).json({ message: "Success" });
  });
});

// 그래프 데이터 이번주거 반환
app.get('/get-graph', (req, res) => {
    // 세션 확인
    if (!req.session || !req.session.username) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }
  
    // DB에서 사용자ID 조회
    const queryUserId = 'SELECT id FROM users WHERE username = ?';
    db.query(queryUserId, [req.session.username], (err, userResults) => {
      if (err || userResults.length === 0) {
        console.error(err || '사용자를 찾을 수 없습니다.');
        return res.status(500).json({ message: '사용자 조회 실패' });
      }
  
      const userId = userResults[0].id; // userId 가져오기
  
      // 오늘 날짜 기준 주간 범위 계산
      const today = new Date(); 
      const currentDay = today.getDay(); // 오늘 요일 값 (0: 일요일, 1: 월요일, ...)
      const startOfWeek = new Date(today);
  
      // 월요일부터 주간 범위 시작
      startOfWeek.setDate(today.getDate() - currentDay + 1); // 월요일 날짜로 설정
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // 주의 끝인 일요일까지
  
      console.log("주간 범위 시작일:", startOfWeek, "종료일:", endOfWeek);
  
      // DB에서 해당 주의 데이터 조회
      const queryGraphData = `SELECT date, weight FROM DateWeight WHERE user_id = ? AND DATE(date) BETWEEN ? AND ?;`;
      db.query(
        queryGraphData,
        [
          userId,
          startOfWeek.toISOString().split('T')[0],
          endOfWeek.toISOString().split('T')[0],
        ],
        (err, weightResults) => {
          if (err) {
            console.error('데이터 조회 중 에러', err);
            return res.status(500).json({ message: '데이터 조회 실패' });
          }
  
          console.log('Weight results from DB:', weightResults);
  
          // 체중 데이터 처리
          const weekDates = [];
          const weights = [];
          const allDatesInWeek = [];
  
          // 주간 날짜 범위 초기화 (월요일 ~ 일요일까지)
          for (let d = new Date(startOfWeek); d <= endOfWeek; d.setDate(d.getDate() + 1)) {
            const formattedDate = d.toISOString().split('T')[0];
            allDatesInWeek.push(formattedDate);
          }
  
          // DB에서 반환된 날짜 값의 시간 정보 제거
          const cleanedWeightResults = weightResults.map(row => ({
            date: row.date.toISOString().split('T')[0], // 시간 정보 제거
            weight: row.weight,
          }));
  
          console.log('Cleaned weight data:', cleanedWeightResults);
  
          // 클라이언트에서 반환할 weight 데이터를 매핑
          allDatesInWeek.forEach((date) => {
            const weightForDate = cleanedWeightResults.find((w) => w.date === date);
            weekDates.push(date);
            weights.push(weightForDate ? weightForDate.weight : 0); // 존재하지 않는 데이터는 0 처리
          });
  
          console.log('Week Dates to Compare:', allDatesInWeek);
  
          // 클라이언트 응답 반환
          return res.status(200).json({ date: weekDates, weight: weights });
        }
      );
    });
  });
  
  
  

// 날짜와 몸무게 저장 또는 수정 API
app.post('/save-weight', (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    const { date, weight } = req.body;

    // username을 통해 userId를 조회
    const query = 'SELECT id FROM users WHERE username = ? ';
    db.query(query, [req.session.username], (err, results) => {
        if (err || results.length === 0) {
            console.error(err || 'User not found');
            return res.status(500).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        const userId = results[0].id; // 조회된 user_id

        // DateWeight 테이블에서 해당 userId와 date로 이미 존재하는지 확인
        const checkQuery = 'SELECT * FROM DateWeight WHERE user_id = ? AND date = ?';
        db.query(checkQuery, [userId, date], (err, existingRecord) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: '데이터 조회 중 오류가 발생했습니다.', error: err });
            }

            if (existingRecord.length > 0) {
                // 기존 기록이 있으면 UPDATE
                const updateQuery = 'UPDATE DateWeight SET weight = ? WHERE user_id = ? AND date = ?';
                db.query(updateQuery, [weight, userId, date], (err, result) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ message: '데이터 업데이트 중 오류가 발생했습니다.', error: err });
                    }
                    return res.status(200).json({ message: '저장 성공' });
                });
            } else {
                // 기존 기록이 없으면 INSERT
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
