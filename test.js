const http = require("http");
const url = require("url");
const mysql = require('mysql');
const crypto = require('crypto');
const fs = require("fs");

const UpdateArticleSecret = "a80bfa6001b769ce9689d4208ff2840e21cecde470a7dc109407ae0b0e57821c";


http.createServer(function(request, response) {
  request.setEncoding('utf8');

  var pathname = url.parse(request.url).pathname;
  var arg = url.parse(request.url, true).query;
  console.log('pathname: ' + pathname);

  response.setHeader("Access-Control-Allow-Origin","http://localhost:8081"); // 方便本地调试（vue项目的dev端口必须为8081）
  response.setHeader("Access-Control-Allow-Headers","Content-Type");
  // response.writeHead(200, {'Content-Type': 'text/plain'});


  var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'rootroot',
    database: 'test'
  });
  connection.connect();

  if (pathname == "/blog/") { // 获取文章列表
    let sql = 'select id, title, DATE_FORMAT(create_date, \'%Y年%m月%d日\') as date from blog order by create_date DESC';
    connection.query(sql, function(error, res) {
      let results = {};
      results.blogList = res;

      if (typeof res != 'undefined') {
        response.write(JSON.stringify(results));
      }
      response.end();
    });
  } else if (pathname == "/blog/getUserIP") { // 获取用户IP
    let yourIP = request.headers['x-forwarded-for'] || request.connection.remoteAddress; //需要在nginx上进行配置

    let results = {};

    results.userIP = yourIP;
    response.write(JSON.stringify(results));
    response.end();
  } else if (pathname == "/blog/detail") {
    var title = arg.title;
    var sql = `select * from blog where title = '${title}'`;
    connection.query(sql, function(error, results) {
      console.log('results of /blog/detail: ' + results);
      response.write(JSON.stringify(results));
      response.end();
    });
  } else if (pathname == "/blog/sendMessage") { // todo: 修改为post形式
    console.log(arg);
    let sql = `INSERT INTO message (user_message, user_name, user_email, user_website, send_date, message_for) 
    values
    (${connection.escape(arg.user_message)}, ${connection.escape(arg.user_name)}, ${connection.escape(arg.user_email)}, ${connection.escape(arg.user_website)}, NOW(), ${connection.escape(arg.message_for)})`;

    console.log(sql);
    connection.query(sql, function(err, res) {
      // console.log(res);
      if (typeof res != "undefined") {
        response.write(JSON.stringify(res));
      } else {
        response.write(JSON.stringify(0));
      }
      response.end();
    });
  } else if (pathname == "/blog/getMessages") {
    let sql = `select id, user_name, user_message, user_website, DATE_FORMAT(send_date, \'%Y-%m-%d %H:%i:%s\') as date from message where message_for='${arg.message_for}'`;
    console.log(sql);
    connection.query(sql, function(error, res) {
      if (typeof res != 'undefined') {
        response.write(JSON.stringify(res));
      }
      response.end();
    });

  } else if (pathname == "/blog/ipAddress") {
    let user_ip = arg.user_ip;
    let view_title = arg.view_title;
    let view_date = new Date();

    connection.query('INSERT INTO ip SET ?', {
      user_ip: user_ip,
      view_title: view_title,
      view_date: view_date,
    }, function(error, results) {
      console.log(typeof results);
      if (typeof results != 'undefined') {
        response.write(JSON.stringify(results));
      }
      response.end();
    })
  } else if (pathname == "/blog/ipFilter") { // 判断这个ip今天是否访问过这个页面，如果是则返回true，不是则返回false
    let user_ip = arg.user_ip;
    let view_title = arg.view_title;
    let view_date = new Date();

    let date = "";

    if (view_date.getDate() < 10) {
      date = '0' + view_date.getDate();
    } else {
      date = view_date.getDate();
    }

    let formate_view_date = view_date.getFullYear() + '-' + (view_date.getMonth() + 1) + '-' + date;

    let sql = `select * from ip where user_ip='${user_ip}' and view_title='${view_title}' and date_format(view_date, '%Y-%m-%d')='${formate_view_date}'`;

    connection.query(sql, function(error, res) {
      if (typeof res != 'undefined') {
        if (res.length != 0) {
          response.write('true');
        } else {
          response.write('false');
        }
      }
      response.end();
    })

  } else if (pathname == "/blog/getUserIPList") {
    let sql = 'select * from ip order by view_date DESC';
    connection.query(sql, function(error, res) {
      let results = {};
      results.ipList = res;
      if (typeof res != 'undefined') {
        response.write(JSON.stringify(results));
      }
      response.end();
    });
  } else if (pathname == "/blog/getUserIPFormat") {
    let sql = `select date_format(view_date, '%Y-%m-%d') date, count(*) count from ip group by date_format(view_date, '%Y-%m-%d');`;
    connection.query(sql, function(error, res) {
      let results = {};
      results.ipListFormat = res;
      if (typeof res != 'undefined') {
        response.write(JSON.stringify(results));
      }
      response.end();
    });
  } else if (pathname == "/blog/getArticleFormat") {
    let sql = `select date_format(create_date, '%Y-%m') as date, count(*) as count from blog group by date ORDER BY date;`;
    connection.query(sql, function(error, res) {
      let results = {};
      results.articleListFormat = res;
      if (typeof res != 'undefined') {
        response.write(JSON.stringify(results));
      }
      response.end();
    });
  } else if (pathname == "/blog/updateBlogContent") {
    let post = '';

    request.on('data', function(chunk){
      post += chunk;
    });

    request.on('end', function(){

      if (post != '') {
        let userData = JSON.parse(post);
        const secret = userData.passport;
        const hash = crypto.createHmac('sha256', secret).digest('hex');
        if (hash == UpdateArticleSecret) {
          connection.query(`UPDATE blog SET ? where id=${userData.id}`, {
            content: userData.blog_content,
          }, function(res) {
          })
        } else {
          console.log('fail');
        }
      }
    });

    response.end();
  } else if (pathname == "/blog/PS") {
    var files = fs.createReadStream(__dirname + "/attachments/PS-Xie+Ruochen.pages");
    response.writeHead(200, {'Content-disposition': 'attachment; filename=PS-Xie+Ruochen.pages'});
    files.pipe(response);
  } else if (pathname == "/blog/getMessageList") {
    let sql = "select * from message order by send_date LIMIT 5";

    connection.query(sql, function(error, res) {
      let results = {};
      results.articleListFormat = res;
      if (typeof res != 'undefined') {
        response.write(JSON.stringify(results));
      }
      response.end();
    });
  }

}).listen(8888);