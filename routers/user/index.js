const { Router, application } = require('express');
const { handleInvalidParameter, handleDataResponse, handleErrorResponse } = require('../../utils/response');
const util = require('util')
//const connection = require('../../database');
const pool = require('../../database');
const path = require('path')
const bcrypt = require('bcrypt')
const multer = require('multer')
//infected atk file upload config
const storage1 = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, 'views/img/infImg/');
    },
    filename: function (req, file, callback) {
        const id = req.session.user_id;
        const time = new Date().toDateString();
        const today = time.substring(4, 15);
        file.filename = id + today + '.jpg';
        callback(null, file.filename);
    }
});
//recover atk file upload config
const storage2 = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, 'views/img/recImg/');
    },
    filename: function (req, file, callback) {
        const id = req.session.user_id;
        const time = new Date().toDateString();
        const today = time.substring(4, 15);
        file.filename = id + today + '.jpg';
        callback(null, file.filename);
    }
});
const uploadinf = multer({ storage: storage1 });
const uploadrec = multer({ storage: storage2 });
const router = Router();

function hashPassword(password) {
    const salt = bcrypt.genSaltSync(5)
    const hash = bcrypt.hashSync(password, salt,)
    return hash
}
//Check user infect status before load report page
router.get('/userstatus', (req, res, next) => {
    const id = req.session.user_id;
    pool.query('SELECT EXISTS(SELECT user_id FROM infected_report WHERE user_id = ?)', [id], function (err, result, fields) {
        if (err) {
            console.error(err);
        }
        //console.log(Object.entries(result));
        var result = Object.values(result[0])
        //console.log(result[0])
        if (result[0] == 0) {
            //NOT EXIST
            res.renderData = result[0];
            res.bypassContainer = true;
            next()
        } else if (result[0] == 1) {
            //EXIST
            pool.query('SELECT user_status FROM infected_report WHERE user_id = ? ORDER BY inf_id DESC LIMIT 1', [id], function (err, result, fields) {
                var status = result[0].user_status
                console.log(status)
                if (status == 'infect') {
                    status = '1'
                    res.renderData = status;
                    res.bypassContainer = true;
                    next()
                } else {
                    status = '0'
                    res.renderData = status;
                    res.bypassContainer = true;
                    next()
                }
            });
        };
    });
});
//Store infected atk image
router.post('/inf', uploadinf.single('inf'), (req, res) => {
    const id = req.session.user_id;
    const today = new Date();
    const status = 'infect';
    const name = req.file.filename;
    pool.query('INSERT INTO infected_report(user_id,inf_date,user_status,img_name) VALUES(?,?,?,?)', [id, today, status, name], function (err, results, fields) {
        if (err) {
            console.error(err);
        } else {
            console.log('Successfully upload 1 infected user');
            res.send('Successfully upload your atk image');
        }
    });
});
//Store recovery atk image
router.post('/rec', uploadrec.single('rec'), (req, res) => {
    const id = req.session.user_id;
    const today = new Date();
    const status = 'recover';
    const name = req.file.filename;
    pool.query('SELECT inf_id FROM infected_report WHERE user_id = ? ORDER BY inf_id DESC LIMIT 1', [id], function (err, result, fields) {
        if (err) {
            console.error(err);
        }
        inf_id = result[0].inf_id;
        console.log(inf_id);
        pool.query('UPDATE infected_report SET user_status = ? WHERE user_id = ? and inf_id = ?', [status, id, inf_id], function (err, result, fields) {
            if (err) {
                console.error(err);
            }
            console.log(inf_id);
            pool.query('INSERT INTO recover_report(inf_id,user_id,rec_date,img_name) VALUES(?,?,?,?)', [inf_id, id, today, name], function (err, result, fields) {
                if (err) {
                    console.error(err);
                }
                console.log('Successfully upload 1 recover user');
                res.send('Successfully upload your atk image');
            });
        })
    });
});
//LOGIN
router.post('/auth', (req, res) => {
    const id = req.body.id;
    const pwd = req.body.pwd;
    const hpwd = hashPassword(pwd);
    // if id or pwd field is empty
    if (!id || !pwd) {
        return handleInvalidParameter(res);
    }
    //else id or pwd field not empty
    pool.query('SELECT * FROM auvaccine.user WHERE user_id = ?', [id], function (err, results, fields) {
        //console.log(results);
        if (err) {
            console.error(err);
            return handleErrorResponse(res, 500, 'SERVER_ERROR');
        }
        if (results.length == 0 && !bcrypt.compareSync(pwd, hpwd)) {
            return handleErrorResponse(res, 403, 'INVALID_CREDENTIAL');
        }
        // Authenticate the user
        req.session.loggedin = true;
        req.session.user_id = results[0].user_id;
        req.session.user_name = results[0].user_name;
        req.session.user_surname = results[0].user_surname;
        req.session.user_email = results[0].user_email;
        req.session.user_phone = results[0].user_phone;
        req.session.user_gender = results[0].user_gender;
        req.session.user_type = results[0].user_type;
        req.session.user_cid = results[0].user_cid;
        req.session.user_role = results[0].user_role;
        const role = results[0].user_role;
        res.json(role);
        console.log(role);
        console.log('User successfully login with ticket: ' + req.session.id);
        console.log('User successfully login with id: ' + req.session.user_id);
        //return handleDataResponse(res, null);

    });

});
//REGISTER
router.post('/register', (req, res) => {
    const body = req.body
    const id = body["user_id"]
    const pwd = body["user_pwd"]
    const name = body["user_name"]
    const sname = body["user_surname"]
    const gender = body["user_gender"]
    const email = body["user_email"]
    const type = body["user_type"]
    const phone = body["user_phone"]
    const citizenid = body["user_citizen_id"]
    const role = 'user'
    const sql = 'INSERT INTO auvaccine.user(user_id,user_pwd,user_name,user_surname,user_gender,user_email,user_type,user_phone,user_cid,user_role) VALUES(?,?,?,?,?,?,?,?,?,?)';
    const hpwd = hashPassword(pwd)
    console.log(hpwd)
    pool.query(sql, [id, hpwd, name, sname, gender, email, type, phone, citizenid, role], (err, rows, fields) => {
        if (err) {
            console.error(err)
        } else {
            console.log('Successfully register 1 user')
            return handleDataResponse(res, null);
        }
    })
});
//DISPLAY FULL NAME
router.get('/fullname', (req, res) => {
    const name = req.session.user_name;
    const surname = req.session.user_surname;
    const fullname = name + ' ' + surname;
    if (req.session.loggedin) {
        res.json(fullname);
    }
});
//DISPLAY PROFILE
router.get('/profile', (req, res) => {
    const id = req.session.user_id;
    const name = req.session.user_name;
    const surname = req.session.user_surname;
    const email = req.session.user_email;
    const phone = req.session.user_phone;
    const gender = req.session.user_gender;
    const type = req.session.user_type;
    const cid = req.session.user_cid;
    const all = id + ' ' + name + ' ' + surname + ' ' + email + ' ' + phone + ' ' + gender + ' ' + type + ' ' + cid;
    if (req.session.loggedin) {
        res.json(all);
    }
});
//Change pwd
router.post('/cpwd', (req, res) => {
    const body = req.body;
    const pwd = body["user_pwd"];
    const hpwd = hashPassword(pwd);
    pool.query('UPDATE auvaccine.user SET user_pwd = ?', [hpwd], function (err, results, fields) {
        if (err) {
            console.error(err);
        }
        console.log('change password success')
        res.send('Change password successfully');
    });
});
//Change name
router.post('/cname', (req, res) => {
    const body = req.body;
    const name = body["user_name"];
    const session = req.session.user_id;
    pool.query('UPDATE auvaccine.user SET user_name = ? WHERE user_id = ?', [name, session], function (err, results, fields) {
        if (err) {
            console.error(err);
        }
        pool.query('SELECT user_name FROM auvaccine.user WHERE user_id = ?', [session], function (err, results, fields) {
            if (err) {
                console.error(err);
            }
            req.session.user_name = results[0].user_name;
            res.send('Change name successfully');
        });
    });
});
//Change surname
router.post('/csurname', (req, res) => {
    const body = req.body;
    const surname = body["user_surname"];
    const session = req.session.user_id;
    pool.query('UPDATE auvaccine.user SET user_surname = ? WHERE user_id = ?', [surname, session], function (err, results, fields) {
        if (err) {
            console.error(err);
        }
        pool.query('SELECT user_surname FROM auvaccine.user WHERE user_id = ?', [session], function (err, results, fields) {
            if (err) {
                console.error(err);
            }
            req.session.user_surname = results[0].user_surname;
            console.log('change surname success')
            res.send('Change surname successfully');
        });
    });
});
//Change email
router.post('/cemail', (req, res) => {
    const body = req.body;
    const email = body["user_email"];
    const session = req.session.user_id;
    console.log(email);
    pool.query('UPDATE auvaccine.user SET user_email = ? WHERE user_id = ?', [email, session], function (err, results, fields) {
        if (err) {
            console.error(err);
        }
        pool.query('SELECT user_email FROM auvaccine.user WHERE user_id = ?', [session], function (err, results, fields) {
            if (err) {
                console.error(err);
            }
            req.session.user_email = results[0].user_email;
            res.send('Change email successfully');
        });
    });
});
//Change phone
router.post('/cphone', (req, res) => {
    const body = req.body;
    const phone = body["user_phone"];
    const session = req.session.user_id;
    pool.query('UPDATE auvaccine.user SET user_phone = ? WHERE user_id = ?', [phone, session], function (err, results, fields) {
        if (err) {
            console.error(err);
        }
        pool.query('SELECT user_phone FROM auvaccine.user WHERE user_id = ?', [session], function (err, results, fields) {
            if (err) {
                console.error(err);
            }
            req.session.user_phone = results[0].user_phone;
            res.send('Change phone successfully');
        });
    });
});
//display infect number on home page
router.get('/infnumber', function (req, res) {
    const inf = 'infect'
    var today;
    var totalinf;
    var totalrec;
    pool.query('SELECT user_status,COUNT(*) AS today FROM infected_report WHERE user_status = ? and CURDATE()', [inf], function (err, result, fields) {
        if (err) {
            console.error(err);
        }
        today = result[0].today;
        pool.query('SELECT user_status,COUNT(*) AS total FROM infected_report WHERE user_status = ?', [inf], function (err, result, fields) {
            if (err) {
                console.error(err);
            }
            totalinf = result[0].total;
            pool.query('SELECT COUNT(*) AS total FROM recover_report', function (err, result, fields) {
                if (err) {
                    console.error(err);
                }
                totalrec = result[0].total;
                let all = { today: today, totalinf: totalinf, totalrec: totalrec };
                res.send(all);
            });
        });
    });
});
//Search user for super admin to edit
router.post('/editprofile', function (req, res, next) {
    const body = req.body;
    const userId = body["user_id"];
    pool.query('SELECT * FROM user WHERE user_id = ?', [userId], function (err, result, fields) {
        if (err) {
            console.error(err);
        }
        console.log()
        res.renderData = result[0];
        res.bypassContainer = true;
        next();
    });
});
//super admin change id
router.post('/chid', (req, res) => {
    const body = req.body;
    const id = body["user_id"];
    const cid = body["user_cid"];
    pool.query('UPDATE auvaccine.user SET user_id = ? WHERE user_cid = ?', [id, cid], function (err, results, fields) {
        if (err) {
            console.error(err);
        }
        res.send('Successfully change user ID')
    });
});
//super admin change cid
router.post('/chcid', (req, res) => {
    const body = req.body;
    const id = body["user_id"];
    const cid = body["user_cid"];
    pool.query('UPDATE auvaccine.user SET user_cid = ? WHERE user_id = ?', [cid, id], function (err, results, fields) {
        if (err) {
            console.error(err);
        }
        res.send('Successfully change user citizen ID')
    });
});
//super admin change gender
router.post('/chgender', (req, res) => {
    const body = req.body;
    const id = body["user_id"];
    const gender = body["user_gender"];
    console.log(body)
    pool.query('UPDATE auvaccine.user SET user_gender = ? WHERE user_id = ?', [gender, id], function (err, results, fields) {
        if (err) {
            console.error(err);
        }
        res.send('Successfully change user gender')
    });
});
//super admin change type
router.post('/chtype', (req, res) => {
    const body = req.body;
    const id = body["user_id"];
    const type = body["user_type"];
    pool.query('UPDATE auvaccine.user SET user_type = ? WHERE user_id = ?', [type, id], function (err, results, fields) {
        if (err) {
            console.error(err);
        }
        res.send('Successfully change user type')
    });
});
//super admin change role
router.post('/chrole', (req, res) => {
    const body = req.body;
    const id = body["user_id"];
    const role = body["user_role"];
    pool.query('UPDATE auvaccine.user SET user_role = ? WHERE user_id = ?', [role, id], function (err, results, fields) {
        if (err) {
            console.error(err);
        }
        res.send('Successfully change user role')
    });
});
//super admin delete user record
router.post('/delid', (req, res) => {
    const body = req.body;
    const id = body["user_id"];
    pool.query('DELETE FROM user WHERE user_id = ?', [id], function (err, results, fields) {
        if (err) {
            console.error(err);
        }
        res.send('Successfully delete user record')
    });
});
// reminder notification
router.get('/noti', (req, res, next) => {
    const id = req.session.user_id;
    var reminder;
    pool.query(`SELECT app_date FROM appointment LEFT JOIN user_appointment ON appointment.app_id = user_appointment.app_id 
                WHERE app_date >= NOW() AND app_date <= NOW() + INTERVAL 14 DAY AND user_id = ?`, [id], function (err, results) {
        if (err) {
            console.error(err);
        }
        console.log(results.length)
        if (results.length == 0) {
            res.renderData = results.length;
            res.bypassContainer = true;
            next()
        } else if (results.length >= 1) {
            results = results[0].app_date.toDateString()
            reminder = [{ app_date: results }];
            res.renderData = reminder;
            res.bypassContainer = true;
            next()
        }
    });
});
exports.userRouter = router;
