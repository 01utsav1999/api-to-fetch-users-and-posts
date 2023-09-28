const axios = require('axios');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();


const api_key = '651518a5dd2cc9054c7ced83';


const users_api_url = 'https://dummyapi.io/data/v1/user';
const posts_api_url = 'https://dummyapi.io/data/v1/user/{user_id}/post';


const db = new sqlite3.Database('users_posts.db'); 


db.serialize(() => {
  db.run('DROP TABLE IF EXISTS posts');
  db.run('CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, userId TEXT, title TEXT, body TEXT)');
});


async function fetchAndStoreUsers() {
  const headers = { 'app-id': api_key };
  try {
    const response = await axios.get(users_api_url, { headers });
    const users = response.data.data;
  
    db.serialize(() => {
        db.run('DROP TABLE IF EXISTS users');
        db.run('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, firstName TEXT, lastName TEXT, email TEXT)');
      });
    db.serialize(() => {
      const stmt = db.prepare('INSERT OR IGNORE INTO users VALUES (?, ?, ?, ?)');
      for (const user of users) {
        stmt.run(user.id, user.firstName, user.lastName, user.email);
      }
      stmt.finalize();
    });
    console.log('Users data fetched and stored successfully.');
  } catch (error) {
    console.error('Error fetching users:', error.message);
  }
}


async function fetchAndStorePosts() {
  db.serialize(async () => {
    db.all('SELECT id FROM users', async (err, rows) => {
      if (err) {
        console.error('Error fetching user IDs from database:', err.message);
        return;
      }

      const headers = { 'app-id': api_key };
      for (const row of rows) {
        const user_id = row.id;
        const url = posts_api_url.replace('{user_id}', user_id);
        try {
          const response = await axios.get(url, { headers });
          const posts = response.data.data;

          const stmt = db.prepare('INSERT INTO posts VALUES (?, ?, ?, ?)');
          for (const post of posts) {
            stmt.run(post.id, user_id, post.title, post.body);
          }
          stmt.finalize();
        } catch (error) {
          console.error(`Error fetching posts for user ${user_id}:`, error.message);
        }
      }
      console.log('Posts data fetched and stored successfully.');
    });
  });
}


fetchAndStoreUsers();
fetchAndStorePosts();