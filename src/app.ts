import { Pool } from 'pg';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import path from 'path';
import { Strategy as LocalStrategy } from 'passport-local';

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
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [
      req.body.username,
      req.body.password,
    ]);
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

app.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});


passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );
      const user = rows[0];

      if (!user) {
        return done(null, false, { message: 'Incorrect username' });
      }
      if (user.password !== password) {
        return done(null, false, { message: 'Incorrect password' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, (user as {id: number}).id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    const user = rows[0];

    done(null, user);
  } catch(err) {
    done(err);
  }
});

app.listen(3000, () => console.log('app listening on port 3000!'));
