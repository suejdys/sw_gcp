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
        return res.status(401).json({ message: 'Unauthorized' });
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
        return res.status(401).json({ message: 'Unauthorized' });
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
        return res.status(401).json({ message: 'Unauthorized' });
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

//메모 수정 API
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

  // Save target weight API
app.post("/save-target-weight", (req, res) => {
  if (!req.session.username) {
    return res.status(401).json({ message: "Unauthorized" });
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

// 목표 몸무게 저장
app.post("/save-target-weight", (req, res) => {
    if (!req.session.username) {
      return res.status(401).json({ message: "Unauthorized" });
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
  
// Session username route
app.get('/session-username', (req, res) => {
    if (req.session.username) {
        res.json({ username: req.session.username });
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
