const express = require('express')
const bodyParser = require('body-parser')
const mysql = require('mysql')
const path = require('path')
const connection = require("./database");
const session = require('express-session');
const { rootRouter } = require('./routers');
const config = require('config');
const app = express();
const port = 3000;
const axios = require('axios').default;

var MySQLStore = require('express-mysql-session')(session);
var options = config.get('mysql');
var sessionStore = new MySQLStore(options);

app.use(session({
    key: 'session_cookie',
    secret: 'secret',
    store: sessionStore,
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
//parse to json
app.use(express.json());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
//public
app.use(express.static(path.join(__dirname, 'views')));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));


app.use(rootRouter);

app.use(function (req, res, next) {
    console.info(req.url);
    if (!req.session.user_id && req.path.slice(1) != 'login') {
        return res.redirect('/login');
    }
    if(res.bypassContainer) {
        return res.render(req.path.slice(1), { renderData: res.renderData });
    }
    res.render('index', { page: req.path.slice(1) , renderData: res.renderData});
});

app.get('/', function (req, res, next) {
    res.render('index');
});

// Catch error and render error page

app.use(function (err, req, res, next) {
    // If error message has path = 404 unknown page
    if (err.path) {
        return next();
    }
    console.error(err);
    res.render("error");
});


// Handle unknown page

app.use(function (req, res) {
    res.render("404");
})



app.use(express.static(path.join(__dirname, 'views')))


app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
})