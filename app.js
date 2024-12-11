const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./db');
const app = express();
const PORT = 3000;  
const HOST = '0.0.0.0'; // 모든 네트워크 인터페이스에서 수신 대기

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
        console.log('db 쿼리중');
        db.query(query, [username, hashedPassword], (err, result) => {
            if (err) {
              console.log(err);
                return res.status(500).json({ message: 'Error registering user', error: err });
            } else {
              console.log('회원가입 성공');
                return res.status(200).json({ message: 'Registration successful' });
            }
        });
    } catch (error) {
        console.log(err);
        return res.status(500).json({ message: 'Server error', error: error });
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const query = 'SELECT * FROM users WHERE username = ?';
        console.log('db 쿼리중');
        db.query(query, [username], async (err, results) => {
            if (err || results.length === 0) {
                console.log('사용자가 없습니다.');
                return res.status(400).json({ message: 'Invalid username or password' });
            } else {
                const user = results[0];
                const match = await bcrypt.compare(password, user.password);

                if (match) {
                    req.session.username = username;  // Store username in session
                    console.log('로그인 성공');
                    return res.status(200).json({ message: 'Login successful', username: user.username });
                } else {
                    console.log('비번, 사용자가 없습니다.');
                    return res.status(400).json({ message: 'Invalid username or password' });
                }
            }
        });
    } catch (error) {
        console.log(err);
        return res.status(500).json({ message: 'Server error', error: error });
    }
});

// 메모 추가 API
app.post('/add-note', (req, res) => {
    if (!req.session.username) {
        console.log('로그인 필요(세션 만료)');
        return res.status(401).json({ message: '로그인이 필요합니다' });
    }

    const { title, contents } = req.body;
    const query = 'SELECT id FROM users WHERE username = ?';
    
    db.query(query, [req.session.username], (err, results) => {
        if (err || results.length === 0) {
            console.log('사용자가 없습니다');
            return res.status(500).json({ message: 'User not found' });
        }

        const userId = results[0].id;
        const insertQuery = 'INSERT INTO notes (user_id, title, contents) VALUES (?, ?, ?)';
        console.log('db 쿼리중');
        db.query(insertQuery, [userId, title, contents], (err, result) => {
            if (err) {
                console.error(err); // 메모 추가 오류 로그
                return res.status(500).json({ message: 'Error adding note', error: err });
                
            }
            console.log('메모 추가 완료');
            return res.status(200).json({ message: '추가 완료' });
        });
    });
});

// 메모 조회 API
app.get('/get-notes', (req, res) => {
    if (!req.session.username) {
        console.log('로그인 필요합니다.');
        return res.status(401).json({ message: '로그인이 필요합니다' });
    }

    const query = 'SELECT notes.id, notes.title, notes.contents, notes.created_at FROM notes INNER JOIN users ON notes.user_id = users.id WHERE users.username = ?';
    console.log('db 쿼리중');
    db.query(query, [req.session.username], (err, results) => {
        if (err) {
            console.log('메모 조회시 오류 발생');
            return res.status(500).json({ message: 'Error fetching notes', error: err });
        }
        console.log('메모 조회 완료');
        res.status(200).json(results);
    });
});

// 메모 삭제 API
app.delete('/delete-note/:id', (req, res) => {
    if (!req.session.username) {
        console.log('로그인이 필요합니다.');
        return res.status(401).json({ message: '로그인이 필요합니다' });
    }
    
    const noteId = req.params.id;
    const deleteQuery = 'DELETE FROM notes WHERE id = ?';
    console.log('db 쿼리중');
    db.query(deleteQuery, [noteId], (err, result) => {
        if (err) {
            console.log('메모 삭제시 에러가 발생하였습니다.');
            return res.status(500).json({ message: 'Error deleting note', error: err });
        }
        console.log('메모 삭제 완료');
        res.status(200).json({ message: '삭제 완료' });
    });
});

// 메모 수정 API
app.put('/update-notes/:id', (req, res) => {
    const memo_id = req.params.id;
    const { title, content } = req.body;
    const query = 'UPDATE notes SET title = ?, contents = ? WHERE id = ?';
    console.log('db 쿼리중');
    db.query(query, [title, content, memo_id], (err, result) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.status(200).send({ message: '수정 완료' });
      }
    });
  });

// 날짜와 몸무게 저장 또는 수정 API
app.post('/save-weight', (req, res) => {
  if (!req.session.username) {
      console.log('로그인 필요(세션 만료)');
      return res.status(401).json({ message: '로그인이 필요합니다.' });
  }

  const { date, weight } = req.body;

  // username을 통해 userId를 조회
  const query = 'SELECT id FROM users WHERE username = ? ';
  console.log('db 쿼리중');
  db.query(query, [req.session.username], (err, results) => {
      if (err || results.length === 0) {
          console.error(err || 'User not found');
          return res.status(500).json({ message: '사용자를 찾을 수 없습니다.' });
      }

      const userId = results[0].id; // 조회된 user_id

      // DateWeight 테이블에서 해당 userId와 date로 이미 존재하는지 확인
      const checkQuery = 'SELECT * FROM DateWeight WHERE user_id = ? AND date = ?';
      console.log('db 쿼리중');
      db.query(checkQuery, [userId, date], (err, existingRecord) => {
          if (err) {
              console.error(err);
              return res.status(500).json({ message: '데이터 조회 중 오류가 발생했습니다.', error: err });
          }

          if (existingRecord.length > 0) {
              // 기존 기록이 있으면 UPDATE
              const updateQuery = 'UPDATE DateWeight SET weight = ? WHERE user_id = ? AND date = ?';
              console.log('db 쿼리중(날짜별 몸무게 수정)');
              db.query(updateQuery, [weight, userId, date], (err, result) => {
                  if (err) {
                      console.error(err);
                      return res.status(500).json({ message: '데이터 업데이트 중 오류가 발생했습니다.', error: err });
                  }
                  console.log('날짜별 몸무게 수정 성공');
                  return res.status(200).json({ message: '저장 성공' });
              });
          } else {
              // 기존 기록이 없으면 INSERT
              const insertQuery = 'INSERT INTO DateWeight (user_id, date, weight) VALUES (?, ?, ?)';
              console.log('db 쿼리중(날짜별 몸무게 추가)');
              db.query(insertQuery, [userId, date, weight], (err, result) => {
                  if (err) {
                      console.error(err);
                      return res.status(500).json({ message: '데이터 저장 중 오류가 발생했습니다.', error: err });
                  }
                  console.log('날짜별 몸무게 추가 성공');
                  return res.status(200).json({ message: '저장 성공' });
              });
          }
      });
  });
});

// 그래프 데이터 반환(클라이언트가 보낸 날짜를 기준으로 해당 주 데이터 반환) API
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
    console.log('db 쿼리중');
    db.query(queryUserId, [req.session.username], (err, userResults) => {
      if (err || userResults.length === 0) {
        console.error(err || '사용자를 찾을 수 없습니다.');
        return res.status(500).json({ message: '사용자 조회 실패' });
      }
  
      const userId = userResults[0].id;
      console.log(`사용자 ID: ${userId}`);
  
      // 날짜 배열 생성
      const dateArray = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        dateArray.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1); // 하루씩 증가
      }
  
      console.log('조회할 날짜 배열:', dateArray);
  
      // 결과 배열
      const result = [];
      let queriesCompleted = 0; // 완료된 쿼리 수 카운터
  
      // 각 날짜에 대해 데이터 조회
      dateArray.forEach(dateString => {
        const querySingleDate = `SELECT weight FROM DateWeight WHERE user_id = ? AND date = ?`;

        console.log('db 쿼리중');
        db.query(querySingleDate, [userId, dateString], (err, weightResults) => {
          if (err) {
            console.error('데이터 조회 중 에러', err);
            return res.status(500).json({ message: '데이터 조회 실패' });
          }
  
          // 결과 처리
          if (weightResults.length > 0) {
            result.push({ date: dateString, weight: weightResults[0].weight });
          } else {
            result.push({ date: dateString, weight: 0 }); // 데이터가 없으면 0으로 채움
          }
  
          // 모든 쿼리가 완료되었는지 확인
          queriesCompleted++;
          if (queriesCompleted === dateArray.length) {
            console.log('최종 결과:', result);
            return res.json(result);
          }
        });
      });
    });
  });
  
// 메모 수정 API
app.put('/update-notes/:id', (req, res) => {
  const memo_id = req.params.id;
  const { title, content } = req.body;
  const query = 'UPDATE notes SET title = ?, contents = ? WHERE id = ?';
  console.log('db 쿼리중');
  db.query(query, [title, content, memo_id], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send(err);
    } else {
      console.log('메모 수정 완료');
      res.status(200).send({ message: '수정 완료' });
    }
  });
});

// 목표 몸무게 설정 API
app.post("/save-target-weight", (req, res) => {
if (!req.session.username) {
  console.log('로그인 필요(세션 만료)');
  return res.status(401).json({ message: "로그인이 필요합니다" });
}

const { targetWeight } = req.body;
if (!targetWeight) {
  console.log('목표몸무게가 없음');
  return res.status(400).json({ message: "Invalid target weight" });
}

const query = "UPDATE users SET target_weight = ? WHERE username = ?";
console.log('db 쿼리중');
db.query(query, [targetWeight, req.session.username], (err, result) => {
  if (err) {
    console.log(err);
    return res.status(500).json({ message: "Error updating target weight", error: err });
  }
  console.log('목표몸무게 저장 성공');
  res.status(200).json({ message: "Success" });
});
});

// 목표 몸무게 조회 API
app.get("/get-target-weight", (req, res) => {
  // 로그인 여부 확인
  if (!req.session.username) {
    console.log('로그인 필요(세션 만료)');
    return res.status(401).json({ message: "로그인이 필요합니다" });
  }

  const query = "SELECT target_weight FROM users WHERE username = ?";
  console.log('db 쿼리중');
  db.query(query, [req.session.username], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Error fetching target weight", error: err });
    }

    if (results.length === 0) {
      console.log('사용자 없음');
      return res.status(404).json({ message: "User not found" });
    }

    const targetWeight = results[0].target_weight;

    if (targetWeight === null) {
      console.log('목표몸무게 없음');
      return res.status(200).json({ message: "목표 몸무게가 설정되지 않았습니다", targetWeight: null });
    }
    console.log('목표몸무게 조회 성공');
    res.status(200).json({ targetWeight });
  });
});

// 날짜별 몸무게와 목표 대비 차이 조회
app.get('/get-weight', (req, res) => {
    const { date } = req.query; // 클라이언트에서 날짜 전달받음
    const username = req.session.username; // 세션에서 사용자명 가져오기

    if (!username) {
      console.log('로그인 필요(세션 만료)');
        return res.status(401).json({ error: '로그인 필요' });
    }

    // 사용자 ID와 목표 몸무게 조회
    const getUserInfoQuery = 'SELECT id, target_weight FROM users WHERE username = ?';
    console.log('db 쿼리중');
    db.query(getUserInfoQuery, [username], (err, userResults) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: '사용자 정보 조회 실패' });
        }

        if (userResults.length === 0) {
          console.log('사용자 없음');
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
        }

        const { id: userId, target_weight: targetWeight } = userResults[0];

        // 날짜별 몸무게 조회
        const getWeightQuery = 'SELECT weight FROM DateWeight WHERE user_id = ? AND date = ?';
        console.log('db 쿼리중');
        db.query(getWeightQuery, [userId, date], (err, weightResults) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: '날짜별 데이터 조회 실패' });
            }

            const currentWeight = weightResults.length > 0 ? weightResults[0].weight : null;
            console.log('조회된 현재 몸무게는? : ',currentWeight);
            // 목표 대비 차이 계산
            const weightDifference = currentWeight !== null ? currentWeight - targetWeight : null;
            console.log('조회된 목표몸무게 차이는? : ',weightDifference);
            res.json({
                targetWeight,
                currentWeight, // 데이터가 없을 경우 null 반환
                weightDifference, // 데이터가 없을 경우 null 반환
            });
            console.log('날짜별 몸무게 & 차이 조회 성공');
        });
    });
});

// Start the server
app.listen(PORT,HOST, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
