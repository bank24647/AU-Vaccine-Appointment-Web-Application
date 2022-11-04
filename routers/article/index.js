const { Router, application } = require('express');
const pool = require('../../database');
const multer = require('multer')
//article cover image file upload config
const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, 'views/img/article/');
    },
    filename: function (req, file, callback) {
        const id = req.session.user_id;
        const time = new Date().toDateString();
        const today = time.substring(4, 15);
        file.filename = today + '-' + file.originalname;
        callback(null, file.filename);
    }
});
const uploadart = multer({ storage: storage });

const router = Router();
//upload cover
router.post('/cover', uploadart.single('cover'), function (req, res) {
    const name = req.file.filename;
    pool.query('INSERT INTO article(art_image_name) VALUES(?)', [name], function (err, results, fields) {
        if (err) {
            console.error(err);
        } else {
            console.log('Successfully upload article cover image');
            res.send('upload successful');
        }
    });
});
//create article
router.post('/artcreate', function (req, res) {
    const body = req.body;
    const title = body['art_title'];
    const text = body['art_body']; 
    const today = new Date();
    pool.query('UPDATE article SET art_date = ?,art_title = ?, art_body = ? ORDER BY art_id DESC LIMIT 1', [today, title, text], function (err, results, fields) {
        if (err) {
            console.error(err);
        } else {
            console.log('Successfully create article');
            res.send('Successfully create article');
        }
    });
});
//article list table
router.get('/arttable', function (req, res) {
    pool.query('SELECT * FROM auvaccine.article', function (err, result) {
        if (err) {
            console.error(err); 
        }
        //console.log(result[0].art_image_name)
        for (var i = 0; i < result.length; i++) {
            result[i].art_date = result[i].art_date.toDateString();
        }
        res.json({ data: result });
    });
});
//artmodify
router.post('/artmodify', function (req, res, next) {
    const body = req.body;
    const artId = body["art_id"];
    pool.query('SELECT art_id,art_title,art_body FROM article WHERE art_id = ?', [artId], function (err, result) {
        if (err) {
            console.error(err);
        }
        res.renderData = result[0];
        res.bypassContainer = true;
        next();
    });
});
//delete article record
router.post('/artdelete', function (req, res) {
    const body = req.body;
    const artId = body["art_id"];
    console.log(artId);
    pool.query('DELETE FROM article WHERE art_id = ?', [artId], function (err, result) {
        if (err) {
            console.error(err);
        }
        console.log('Successfully delete 1 article');
        res.send('Successfully delete an article');
    });
});
//modify article title
router.post('/arttitle', function (req, res) {
    const body = req.body;
    const artId = body["art_id"];
    const title = body["art_title"];
    pool.query('UPDATE article SET art_title = ? WHERE art_id = ?', [title, artId], function (err, result) {
        if (err) {
            console.error(err);
        }
        console.log('Successfully change article title');
        res.send('Successfully change article title');
    });
});
//modify article body
router.post('/artbody', function (req, res) {
    const body = req.body;
    const artId = body["art_id"];
    const artbody = body["art_body"];
    pool.query('UPDATE article SET art_body = ? WHERE art_id = ?', [artbody, artId], function (err, result) {
        if (err) {
            console.error(err);
        }
        console.log('Successfully change article body');
        res.send('Successfully change article body');
    });
});
//display article on homepage
router.get('/displayart', function (req, res, next) {
    pool.query('SELECT art_title,art_body,art_image_name FROM article ORDER BY art_id DESC LIMIT 5', function (err, result){
        if (err) {
            console.error(err);
        }
        res.renderData = result;
        res.bypassContainer = true;
        next()
    });
});
exports.articleRouter = router;