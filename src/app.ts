import { Pool } from 'pg';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import path from 'path';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  host: '127.0.0.1',
  user: 'bently',
  database: 'auth_users',
  password: 'drpenguindev',
  port: 5432,
});

(async function testConnection() {
  try {
    // Try to connect to the database
    await pool.query('SELECT NOW()');
    console.log('Password is correct and connection is successful.');
  } catch (err: any) {
    console.error('Failed to connect:', err.message);
  }
})();

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({ secret: 'cats', resave: false, saveUninitialized: false }));

app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.render('index', { user: req.user });
});

app.get('/sign-up', (req, res) => res.render('sign-up-form'));

app.post('/sign-up', async (req, res, next) => {
  try {
    bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
      if (err) throw new Error(`Something went wrong: ${err.stack}`);

      await pool.query(
        'INSERT INTO users (username, password) VALUES ($1, $2)',
        [req.body.username, hashedPassword]
      );
    });
    res.redirect('/');
  } catch (err) {
    return next(err);
  }
});

app.post(
  '/log-in',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/',
  })
);

app.get('/log-out', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

type User = {
  username: string;
  password: string;
};

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );

      const user: User = rows[0];

      if (!user) {
        return done(null, false, { message: 'Incorrect username' });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        // passwords do not match!
        return done(null, false, { message: 'Incorrect password' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, (user as { id: number }).id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [
      id,
    ]);
    const user: User = rows[0];

    done(null, user);
  } catch (err) {
    done(err);
  }
});

app.listen(3000, () => console.log('app listening on port 3000!'));
