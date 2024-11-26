// Register route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
        db.query(query, [username, hashedPassword], (err, result) => {
            if (err) {
                res.status(500).send('Error registering user');
            } else {
                res.status(200).send('Registration successful');
            }
        });
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const query = 'SELECT * FROM users WHERE username = ?';
        db.query(query, [username], async (err, results) => {
            if (err || results.length === 0) {
                res.status(400).send('Invalid username or password');
            } else {
                const user = results[0];
                const match = await bcrypt.compare(password, user.password);

                if (match) {
                    req.session.username = username; // Store username in session
                    res.status(200).send('Login successful');
                } else {
                    res.status(400).send('Invalid username or password');
                }
            }
        });
    } catch (error) {
        res.status(500).send('Server error');
    }
});
