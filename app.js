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
    // 로그인 확인
    if (!req.session || !req.session.username) {
      console.log('로그인 필요: 세션 정보 없음');
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }
  
    const requestedDate = req.query.date; // 요청된 날짜
    console.log(`요청된 날짜: ${requestedDate}`);
    const endDate = new Date(requestedDate); // 요청된 날짜를 종료일로 설정
    const startDate = new Date(endDate); // 시작일은 종료일로 설정
    startDate.setDate(startDate.getDate() - 6); // 1주일 전 날짜 계산 (6일 전)
  
    console.log(`1주일 전 날짜: ${startDate.toISOString().split('T')[0]}`);
    console.log(`종료 날짜: ${endDate.toISOString().split('T')[0]}`);
  
    const queryUserId = 'SELECT id FROM users WHERE username = ?';
    db.query(queryUserId, [req.session.username], (err, userResults) => {
      if (err || userResults.length === 0) {
        console.error(err || '사용자를 찾을 수 없습니다.');
        return res.status(500).json({ message: '사용자 조회 실패' });
      }
  
      const userId = userResults[0].id;
      console.log(`사용자 ID: ${userId}`);
  
      // 날짜 범위에 대한 쿼리
      const queryGraphData = `SELECT date, weight FROM DateWeight WHERE user_id = ? AND date BETWEEN ? AND ?`;
      db.query(queryGraphData, [userId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]], (err, weightResults) => {
        if (err) {
          console.error('데이터 조회 중 에러', err);
          return res.status(500).json({ message: '데이터 조회 실패' });
        }
  
        console.log(`조회된 데이터 수: ${weightResults.length}`);
  
        // 날짜 범위 내 모든 날짜를 생성
        const result = [];
        const currentDate = new Date(startDate);
        console.log('날짜 범위 내 모든 날짜:');
        while (currentDate <= endDate) {
          const dateString = currentDate.toISOString().split('T')[0];
          console.log(dateString); // 생성된 날짜를 콘솔에 출력
          const weightData = weightResults.find(result => result.date.split('T')[0] === dateString);
          if (weightData) {
            result.push({ date: dateString, weight: weightData.weight });
          } else {
            result.push({ date: dateString, weight: 0 }); // 데이터가 없으면 0으로 채움
          }
          currentDate.setDate(currentDate.getDate() + 1); // 하루씩 증가
        }
  
        // 최종 결과 반환
        console.log('최종 결과:', result);
        return res.json(result);
      });
    });
  });
  

// 날짜와 몸무게 저장 또는 수정 API
app.get('/get-graph', (req, res) => {
    const { date } = req.params; // 클라이언트가 주는 기준 날짜 (예: 2024-12-08)
  
    if (!date) {
      return res.status(400).json({ message: '날짜를 선택해주세요.' });
    }
  
    console.log('클라이언트에서 받은 날짜:', date); // 클라이언트에서 보낸 날짜 확인
  
    const queryUserId = 'SELECT id FROM users WHERE username = ?';
    db.query(queryUserId, ['username_placeholder'], (err, userResults) => {
      if (err || userResults.length === 0) {
        console.error(err || '사용자 조회 실패');
        return res.status(500).json({ message: '사용자 조회 실패' });
      }
  
      const userId = userResults[0].id;
  
      // SQL 쿼리를 활용하여 과거 1주일간 데이터 조회
      const queryGraphData = `SELECT DATE(date) AS date, weight FROM DateWeight WHERE user_id = ? AND date BETWEEN date(?, INTERVAL -1 WEEK) AND ?GROUP BY DATE(date);
      `;
  
      db.query(
        queryGraphData,
        [
          userId,
          date, // 기준 날짜를 SQL 쿼리의 시작일로 사용
          date, // 현재 날짜 (끝 범위)
        ],
        (err, weightResults) => {
          if (err) {
            console.error('데이터 조회 중 에러', err);
            return res.status(500).json({ message: '데이터 조회 실패' });
          }
  
          const dbData = weightResults.map((row) => ({
            date: row.date,
            weight: row.weight,
          }));
  
          console.log('Weight results from DB:', dbData);
  
          const weekDates = [];
          const weights = [];
  
          // 주간 날짜 목록 생성
          for (let d = new Date(new Date(date).getTime() - 6 * 24 * 60 * 60 * 1000); d <= new Date(date); d.setDate(d.getDate() + 1)) {
            const formattedDate = new Date(d).toISOString().split('T')[0];
            weekDates.push(formattedDate);
          }
  
          console.log('Week Dates to Compare:', weekDates);
  
          weekDates.forEach((dateStr) => {
            const weightForDate = dbData.find((w) => w.date === dateStr);
            weights.push(weightForDate ? weightForDate.weight : 0);
          });
  
          console.log('Mapped weights:', weights);
  
          return res.status(200).json({
            dates: weekDates,
            weights,
          });
        }
      );
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
