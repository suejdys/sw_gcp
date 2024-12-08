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

// 오늘 날짜를 가지고 이번주를 출력해줌
app.get('/get-graph', (req, res) => {
    if (!req.session || !req.session.username) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }
  
    const queryUserId = 'SELECT id FROM users WHERE username = ?';
    db.query(queryUserId, [req.session.username], (err, userResults) => {
      if (err || userResults.length === 0) {
        console.error(err || '사용자를 찾을 수 없습니다.');
        return res.status(500).json({ message: '사용자 조회 실패' });
      }
  
      const userId = userResults[0].id;
  
      const queryGraphData = `SELECT date, weight FROM DateWeight WHERE user_id = ?`;
      db.query(queryGraphData, [userId], (err, weightResults) => {
        if (err) {
          console.error('데이터 조회 중 에러', err);
          return res.status(500).json({ message: '데이터 조회 실패' });
        }
  
        console.log('Weight results from DB:', weightResults);
  
        // DB에서 가져온 데이터를 정리
        const cleanedWeightResults = weightResults.map(row => ({
          date: row.date.toISOString().split('T')[0], // 시간 제거, 날짜만 유지
          weight: row.weight,
        }));
  
        // 오늘 날짜를 기준으로 이번 주 (월요일 ~ 일요일) 계산
        const today = new Date();
        const dayOfWeek = today.getDay(); // 요일 가져오기 (0: 일요일, 1: 월요일 ...)
  
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
  
        const weekDates = [];
        for (let d = new Date(startOfWeek); d <= endOfWeek; d.setDate(d.getDate() + 1)) {
          weekDates.push(d.toISOString().split('T')[0]); // 날짜 리스트 생성
        }
  
        console.log('Week Dates to Compare:', weekDates);
  
        // 주간 데이터와 DB 데이터를 매핑
        const result = weekDates.map(date => {
          const weightForDate = cleanedWeightResults.find(w => w.date === date);
          return {
            date,
            weight: weightForDate ? weightForDate.weight : 0, // 값이 없으면 0 반환
          };
        });
  
        console.log('Final Weekly Data:', result);
  
        // 응답 반환
        return res.status(200).json({ date: weekDates, weight: result.map(r => r.weight) });
      });
    });
  });
  

  
  

// 날짜와 몸무게 저장 또는 수정 API
app.get('/get-graph', (req, res) => {
    if (!req.session || !req.session.username) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }
  
    const queryUserId = 'SELECT id FROM users WHERE username = ?';
    db.query(queryUserId, [req.session.username], (err, userResults) => {
      if (err || userResults.length === 0) {
        console.error(err || '사용자를 찾을 수 없습니다.');
        return res.status(500).json({ message: '사용자 조회 실패' });
      }
  
      const userId = userResults[0].id;
  
      const queryGraphData = `SELECT date, weight FROM DateWeight WHERE user_id = ?`;
      db.query(queryGraphData, [userId], (err, weightResults) => {
        if (err) {
          console.error('데이터 조회 중 에러', err);
          return res.status(500).json({ message: '데이터 조회 실패' });
        }
  
        console.log('Weight results from DB:', weightResults);
  
        const cleanedWeightResults = weightResults.map(row => ({
          date: row.date.toISOString().split('T')[0], 
          weight: row.weight,
        }));
  
        const today = new Date();
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
  
        const weekDates = [];
        for (let d = new Date(startOfWeek); d <= endOfWeek; d.setDate(d.getDate() + 1)) {
          let adjustedDate = new Date(d);
          adjustedDate.setDate(d.getDate() + 1); // 날짜 값에 +1 추가
          weekDates.push(adjustedDate.toISOString().split('T')[0]);
        }
  
        console.log('Adjusted Week Dates to Compare:', weekDates);
  
        const result = weekDates.map(date => {
          const weightForDate = cleanedWeightResults.find(w => w.date === date);
          return {
            date,
            weight: weightForDate ? weightForDate.weight : 0,
          };
        });
  
        console.log('Final Weekly Data:', result);
  
        return res.status(200).json({ date: weekDates, weight: result.map(r => r.weight) });
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
