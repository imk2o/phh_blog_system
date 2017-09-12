'use strict';
const http = require ('http');
const pug = require ('pug');
const mysql = require ('promise-mysql');
const querystring = require('querystring');

const DB_NAME = 'phh_blog_system';
const DB_USER = process.env['PHH_DB_USER'] || 'root';
const DB_PASSWD = process.env['PHH_DB_PASSWD'] || '';

const server = http.createServer ((req, res) => {
  if (req.method == 'GET' && req.url == '/bootstrap.css') {
    res.writeHead (200, {
      'Content-Type': 'text/css; charset=utf-8'
    });
    const fs = require('fs');
    const rs = fs.createReadStream('./bootstrap.css');
    rs.pipe(res);
    return;
  }

  res.writeHead (200, {
    'Content-Type': 'text/html; charset=utf-8'
  });

  switch (req.method) {
  case 'GET':
    switch (req.url) {
    case '/':
      showTopPage (req, res);
      break;
    case '/profile':
      showProfilePage (req, res);
      break;
    case '/entry/post':
      showPostPage (req, res);
      break;
    default:
      res.end ();
      break;
    }
    break;
  case 'POST':
    switch (req.url) {
    case '/entry/post/add':
      postNewEntry (req, res);
      break;
    default:
      res.end ();
      break;
    }
    break;
  default:
    res.end ();
    break;
  }
}).on('error', (e) => {
  console.error ('[' + new Date() + '] Server Error', e);
}).on('clientError', (e) => {
  console.error ('[' + new Date() + '] Client Error', e);
});

// HTTP サーバーを立ち上げる
const port = 8000;
server.listen (port, () => {
  console.info ('[' + new Date() + '] Listening on ' + port);
});

// トップページを表示する
function showTopPage (req, res) {
  let connection;
  let entries;
  let tags = []

  mysql.createConnection({
    host: 'localhost',
    user: DB_USER,
    password: DB_PASSWD,
    database: DB_NAME
  }).then ((conn) => {
    connection = conn;
    return connection.query ("SELECT * FROM entry");
  }).then ((rows) => {
    entries = rows;
    return connection.query ('SELECT * FROM tag');
  }).then ((rows) => {
    for (let row of rows) {
      tags.push ({
        tag: row,
        query: querystring.stringify (row),
      });
    }

    res.write(pug.renderFile('./includes/top.pug', {
      entries: entries,
      tags: tags,
    }));

    connection.end ();
    res.end ();
  }).catch ((error) => {
    console.log (error);
  });
}

// プロフィールページを表示する
function showProfilePage  (req, res) {
  let connection;

  mysql.createConnection({
    host: 'localhost',
    user: DB_USER,
    password: DB_PASSWD,
    database: DB_NAME
  }).then ((conn) => {
    connection = conn;
    return connection.query ('SELECT name, nickname, type, birthday, updated_at FROM user AS p INNER JOIN blood_type AS b ON p.blood_type_id=b.id');
  }).then ((rows) => {
    res.write(pug.renderFile('./includes/profile.pug', {
      profile: rows[0],
    }));

    connection.end ();
    res.end ();
  }).catch ((error) => {
    console.log (error);
  });;
}

// 投稿ページを表示する
function showPostPage (req, res) {
  let connection;
  
  mysql.createConnection({
    host: 'localhost',
    user: DB_USER,
    password: DB_PASSWD,
    database: DB_NAME
  }).then ((conn) => {
    connection = conn;
    return connection.query ('SELECT * FROM tag');
  }).then ((rows) => {
    res.write(pug.renderFile('./includes/post.pug',
                             {
                               tags: rows,
                             }));
    connection.end ();
    res.end ();
  }).catch ((error) => {
    console.log (error);
  });
}

// 新規投稿をする
function postNewEntry (req, res) {
  // トップページに戻る
  showTopPage (req, res);
}
