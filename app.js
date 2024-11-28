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
    secret: 'yourSecretKey',
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

// Welcome route
app.get('/welcome', (req, res) => {
    if (req.session.username) {
        res.sendFile(__dirname + '/public/welcome.html');
    } else {
        res.redirect('/');
    }
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
