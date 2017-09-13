'use strict';
const http = require ('http');
const pug = require ('pug');
const mysql = require ('promise-mysql');
const querystring = require('querystring');

const DB_NAME = 'phh_blog_system';
const DB_USER = process.env['PHH_DB_USER'] || 'root';
const DB_PASSWD = process.env['PHH_DB_PASSWD'] || '';

const server = http.createServer ((req, res) => {
  res.writeHead (200, {
    'Content-Type': 'text/html; charset=utf-8'
  });

  // パス部分を抽出
  let url = require('url').parse(req.url);

  switch (req.method) {
  case 'GET':
    switch (url.pathname) {
    case '/':
      showTopPage (req, res);
      break;
    case '/profile':
      showProfilePage (req, res);
      break;
    case '/entry/post':
      showPostPage (req, res);
      break;
    case '/entry/edit':
      editEntry (req, res);
      break;
    default:
      res.end ();
      break;
    }
    break;
  case 'POST':
    switch (url.pathname) {
    case '/entry/post/add':
      postNewEntry (req, res);
      break;
    case '/entry/delete':
      deleteEntry (req, res);
      break;
    case '/entry/edit':
      updateEntry (req, res);
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
  let url = require('url').parse(req.url, true);
  let tag_id = url.query['id'];
  
  let connection;
  let entries;
  let tags = [];

  mysql.createConnection({
    host: 'localhost',
    user: DB_USER,
    password: DB_PASSWD,
    database: DB_NAME
  }).then ((conn) => {
    connection = conn;
    if (tag_id) {
      return connection.query ("SELECT * FROM entry WHERE tag_id = ?", [tag_id]);
    } else {
      return connection.query ("SELECT * FROM entry");
    }
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
  req.on('data', (data) => {
    // 入力内容を取得
    const decoded = decodeURIComponent(data);
    let parsedResult = querystring.parse(decoded);

    // DBに登録する
    let connection;
    mysql.createConnection ({
      host: 'localhost',
      user: DB_USER,         // 'root'
      password: DB_PASSWD,   // ''
      database: DB_NAME,
    }).then ((conn) => {
      connection = conn;
      return connection.query(
        'INSERT INTO `entry` (`user_id`, `title`,`tag_id`,`text`) VALUES(?,?,?,?)',
        [
          1,
          parsedResult['title'],
          parsedResult['tag'],
          parsedResult['entry']
        ]
      );
    }).then ((result) => {
      connection.end();

      // トップページに戻る
      showTopPage (req, res);
    }).catch ((error) => {
      console.log(error);
    });
  });
}

// 投稿を編集する
function editEntry (req, res) {
  let url = require('url').parse(req.url, true);
  let entry_id = url.query['id'];

  let connection;
  let entry;
  let tags;
  mysql.createConnection({
    host: 'localhost',
    user: DB_USER,
    password: DB_PASSWD,
    database: DB_NAME
  }).then ((conn) => {
    connection = conn;

    return connection.query (
      'SELECT * FROM `entry` WHERE id = ?',
      [entry_id]
    );
  }).then ((rows) => {
    entry = rows[0];

    return connection.query ('SELECT * FROM `tag`');
  }).then ((rows) => {
    tags = rows;
    res.write(pug.renderFile('./includes/edit.pug',
                             {
                               entry: entry,
                               tags: tags,
                             }));
    connection.end ();
    res.end ();
  }).catch ((error) => {
    console.log (error);
  });
}

// 投稿を更新する
function updateEntry (req, res) {
  req.on('data', (data) => {
    // 入力内容を取得
    const decoded = decodeURIComponent(data);
    let parsedResult = querystring.parse(decoded);

    // DBに登録する
    let connection;
    mysql.createConnection ({
      host: 'localhost',
      user: DB_USER,         // 'root'
      password: DB_PASSWD,   // ''
      database: DB_NAME,
    }).then ((conn) => {
      connection = conn;
      return connection.query(
        'UPDATE `entry` SET `title` = ?, `tag_id` = ?,`text` = ? WHERE id = ?',
        [
          parsedResult['title'],
          parsedResult['tag'],
          parsedResult['entry'],
          parsedResult['id']
        ]
      );
    }).then ((result) => {
      connection.end();

      // トップページに戻る
      showTopPage (req, res);
    }).catch ((error) => {
      console.log(error);
    });
  });
}

// 投稿を削除する
function deleteEntry (req, res) {
  let url = require('url').parse(req.url, true);
  let entry_id = url.query['id'];

  // DBから削除する
  let connection;
  mysql.createConnection ({
    host: 'localhost',
    user: DB_USER,         // 'root'
    password: DB_PASSWD,   // ''
    database: DB_NAME,
  }).then ((conn) => {
    connection = conn;
    return connection.query(
      'DELETE FROM `entry` WHERE id = ?', 
      [entry_id]
    );
  }).then ((result) => {
    connection.end();

    // トップページに戻る
    showTopPage (req, res);
  }).catch ((error) => {
    console.log(error);
  });
}
