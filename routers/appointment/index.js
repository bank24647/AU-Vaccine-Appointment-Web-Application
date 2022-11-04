const { Router, application } = require('express');
const { handleInvalidParameter, handleDataResponse, handleErrorResponse } = require('../../utils/response');
const pool = require('../../database');
const util = require('util');

const router = Router();
//USER SECTION
//display appointment card to user
router.get('/appcard', (req, res, next) => {
    pool.query('SELECT * FROM auvaccine.appointment WHERE vacc_amount > 0 AND app_date > CURRENT_DATE()', function (err, result) {
        if (err) {
            console.error(err);
        }
        for (var i = 0; i < result.length; i++) {
            result[i].app_date = result[i].app_date.toDateString();
        }
        res.renderData = result;
        res.bypassContainer = true;
        next()
    });
});

//user booking
router.post('/appbook', (req, res) => {
    const body = req.body
    const appid = parseInt(body["app_id"])
    const userid = req.session.user_id;
    pool.query('SELECT app_id FROM user_appointment WHERE user_id = ?',[userid], function (err, result){
        var arr = [];
        for(var i=0; i<result.length; i++){
            arr.push(result[i].app_id);
        }
        if (arr.includes(appid)) {
            handleDataResponse(res, 'Sorry, You cannot book the same date twice');
        } else {
            pool.getConnection(async (err, connection) => {
                const query = util.promisify(connection.query).bind(connection);
                try {
                    //ล็อค table
                    await query('LOCK TABLES auvaccine.user_appointment WRITE, auvaccine.appointment READ');
                    //นับจำนวน user ว่ามีคนจองกี่คนแล้วสำหรับ app id นี้
                    const result = await query(`
                    SELECT COUNT(user_id) as amount, user_appointment.app_id, AP.vacc_receive
                    FROM (SELECT app_id, vacc_receive FROM auvaccine.appointment) AP
                        LEFT JOIN
                            auvaccine.user_appointment
                        ON AP.app_id = user_appointment.app_id
                    WHERE AP.app_id = ?
                    GROUP BY AP.app_id`, [appid]);
                    if (result.length === 0) {
                        console.error('Unknown appointment');
                        return handleErrorResponse(res, 422, 'INVALID_APP_ID');
                    }
                    const [{ amount, vacc_receive }] = result;
                    //ถ้ามีจำนวนจองเกิน receive
                    if (amount >= vacc_receive) {
                        console.error('Attempt to overbook');
                        return handleErrorResponse(res, 409, 'This appointment is already fully booked');
                    }
                    //ถ้าจำนวนจองไม่เกิน receive
                    await query('INSERT INTO auvaccine.user_appointment(app_id,user_id) VALUES (?,?)', [appid, userid]);
                } catch (err) {
                    console.error(err);
                    return handleErrorResponse(res, 500, 'SERVER_ERROR');
                }
                //ปลดล็อค
                await query('UNLOCK TABLES');
                await query('UPDATE appointment SET vacc_amount = vacc_amount - 1 WHERE app_id = ?', [appid]);
                connection.release();
                handleDataResponse(res, 'Booking successfull');
            });
        }
    });
});

//display user app list
router.get('/userapplist', async function (req, res, next) {
    const userid = req.session.user_id;
    pool.query('SELECT * FROM appointment INNER JOIN user_appointment ON appointment.app_id = user_appointment.app_id WHERE user_id = ? AND vacc_dose IS NULL', [userid], function (err, result) {
        if (err) {
            console.log(err);
        }
        for (var i = 0; i < result.length; i++) {
            result[i].app_date = result[i].app_date.toDateString();
        }
        res.renderData = result;
        res.bypassContainer = true;
        next()
    });
});
//Cancel user app
router.post('/appcancel', function (req, res) {
    const body = req.body;
    const appid = body["app_id"];
    const userid = req.session.user_id;
    pool.query('UPDATE appointment SET vacc_amount = vacc_amount + 1 WHERE app_id = ?', [appid,], function (err, result) {
        if (err) {
            console.error(err);
        }
        pool.query('DELETE FROM user_appointment WHERE app_id = ? AND user_id= ?', [appid, userid], function (err, result) {
            if (err) {
                console.error(err);
            }
            console.log('Successfully cancel 1 appointment');
            res.send('Successfully cancel an appointment');
        });
    });
});
//display user vaccine history
router.get('/historytable', (req, res) => {
    const session = req.session.user_id;
    pool.query('SELECT * FROM appointment INNER JOIN user_appointment ON appointment.app_id = user_appointment.app_id WHERE user_id = ? AND vacc_lot IS NOT NULL', [session], function (err, result) {
        if (err) {
            console.error(err);
        }
        res.json(result);
    });
});

//ADMIN SECTION
//create appointment
router.post('/create', (req, res) => {
    const body = req.body;
    const hos = body["vacc_hospital"]
    const vaccn = body["vacc_name"]
    const vacca = body["vacc_amount"]
    const appd = body["app_date"]
    const appt = body["app_time"]
    const appl = body["app_location"]
    console.log(appd);
    pool.query('INSERT INTO auvaccine.appointment(vacc_hospital,vacc_name,vacc_amount,app_date,app_time,app_location,vacc_receive) VALUES(?,?,?,?,?,?,?)', [hos, vaccn, vacca, appd, appt, appl, vacca], (err, rows, fields) => {
        if (err) {
            console.error(err)
        }
        console.log('Successfully create 1 appointment')
        return handleDataResponse(res, null);
    });
});
//display appointment table
router.get('/apptable', function (req, res) {
    pool.query('SELECT * FROM auvaccine.appointment', function (err, result) {
        if (err) {
            console.error(err);
        }
        for (var i = 0; i < result.length; i++) {
            result[i].app_date = result[i].app_date.toDateString();
        }
        res.json({ data: result });
    });
});
//display appointment detail
router.post('/appdisplay', function (req, res, next) {
    const body = req.body;
    const appId = body["app_id"];
    pool.query('SELECT app_id,app_time,app_location FROM auvaccine.appointment WHERE app_id = ?', [appId], function (err, result) {
        if (err) {
            console.error(err);
        }
        res.renderData = result[0];
        res.bypassContainer = true;
        next();
    });
});
//delete appointment record
router.post('/appdelete', function (req, res) {
    const body = req.body;
    const appId = body["app_id"];
    console.log(appId);
    pool.query('DELETE FROM appointment WHERE app_id = ?', [appId], function (err, result) {
        if (err) {
            console.error(err);
        }
        console.log('Successfully delete 1 appointment')
        res.end();
    });
});
//modify appointment time
router.post('/apptime', function (req, res) {
    const body = req.body;
    const appId = body["app_id"];
    const time = body["app_time"];
    pool.query('UPDATE auvaccine.appointment SET app_time = ? WHERE app_id = ?', [time, appId], function (err, result) {
        if (err) {
            console.error(err);
        }
        console.log('Successfully change appointment time')
        res.end();
    });
});
//modify appointment location
router.post('/applocation', function (req, res) {
    const body = req.body;
    const appId = body["app_id"];
    const location = body["app_location"];
    pool.query('UPDATE auvaccine.appointment SET app_location = ? WHERE app_id = ?', [location, appId], function (err, result) {
        if (err) {
            console.error(err);
        }
        console.log('Successfully change appointment location')
        res.end();
    });
});
//search user id before check in
router.post('/appcheckin', function (req, res, next) {
    const body = req.body;
    const userId = body["user_id"];
    var today = new Date();
    var daylist = [];
    pool.query('SELECT app_date FROM appointment INNER JOIN user_appointment ON appointment.app_id = user_appointment.app_id WHERE user_id = ?', [userId], function (err, result) {
        if (err) {
            console.error(err);
        }
        for (var i = 0; i < result.length; i++) {
            daylist += result[i].app_date.toDateString() + ','
        }
        var properday = daylist.toString().split(',');
        if (properday.includes(today.toDateString())) {
            result = 1;
            console.log(result);
            res.renderData = result;
            res.bypassContainer = true;
            next();
        } else {
            result = 0;
            console.log(result);
            res.renderData = result;
            res.bypassContainer = true;
            next();
        }
    });
});
//check in by store user dose
router.post('/appdose', function (req, res) {
    const body = req.body;
    const userId = body["user_id"];
    const doseId = body["vacc_dose"];
    pool.query('SELECT app_id FROM appointment WHERE CURRENT_DATE() = app_date', function (err, result) {
        if (err) {
            console.error(err);
        }
        console.log(result[0].app_id)
        var app_id = result[0].app_id;
        pool.query('UPDATE user_appointment SET vacc_dose = ? WHERE app_id = ? AND user_id = ?', [doseId, app_id, userId], function (err, result) {
            if (err) {
                console.error(err);
            }
            res.send('Successfully store user dose data')
        });
    });
});
//search user id before check out
router.post('/appcheckout', function (req, res, next) {
    const body = req.body;
    const userId = body["user_id"];
    var today = new Date();
    var daylist = [];
    pool.query('SELECT app_date FROM appointment INNER JOIN user_appointment ON appointment.app_id = user_appointment.app_id WHERE user_id = ?', [userId], function (err, result) {
        if (err) {
            console.error(err);
        }
        for (var i = 0; i < result.length; i++) {
            daylist += result[i].app_date.toDateString() + ','
        }
        var properday = daylist.toString().split(',');
        if (properday.includes(today.toDateString())) {
            result = 1;
            res.renderData = result;
            res.bypassContainer = true;
            next();
        } else {
            result = 0;
            res.renderData = result;
            res.bypassContainer = true;
            next();
        }
    });
});
//check out by store user vaccine lot and serial
router.post('/applotandserial', function (req, res) {
    const body = req.body;
    const userId = body["user_id"];
    const lot = body["vacc_lot"];
    const serial = body["vacc_serial"];
    pool.query('SELECT app_id FROM appointment WHERE CURRENT_DATE() = app_date', function (err, result) {
        if (err) {
            console.error(err);
        }
        var app_id = result[0].app_id;
        console.log(app_id)
        pool.query('UPDATE user_appointment SET vacc_lot = ?, vacc_serial = ? WHERE app_id = ? AND user_id = ?', [lot, serial, app_id, userId], function (err, result) {
            if (err) {
                console.error(err);
            }
            res.send('Successfully store user lot and serial data')
        });
    });
});
// attendant come report
router.get('/attcome', function (req, res){
    pool.query(`SELECT appointment.app_id,app_date,user.user_id,user_name,user_surname,user_phone,vacc_name,vacc_lot,vacc_serial 
                FROM user_appointment LEFT JOIN appointment ON user_appointment.app_id = appointment.app_id 
                LEFT JOIN user ON user_appointment.user_id = user.user_id WHERE vacc_serial IS NOT NULL`, function (err, result){
        if (err) {
            console.error(err);
        }
        for (var i = 0; i < result.length; i++) {
            result[i].app_date = result[i].app_date.toDateString();
        }
        res.json({ data: result });
    });
});
// attendant not come report
router.get('/attnotcome', function (req, res){
    pool.query(`SELECT app_date,user.user_id,user_name,user_surname,user_phone FROM user_appointment 
                LEFT JOIN appointment ON user_appointment.app_id = appointment.app_id 
                LEFT JOIN user ON user_appointment.user_id = user.user_id 
                WHERE vacc_serial IS NULL AND app_date <= CURDATE()`, function (err, result){
        if (err) {
            console.error(err);
        }
        for (var i = 0; i < result.length; i++) {
            result[i].app_date = result[i].app_date.toDateString();
        }
        res.json({ data: result });
    });
});
// infect report
router.get('/inftable', function (req, res){
    pool.query(`SELECT inf_date,user.user_id,user_name,user_surname,user_status,user.user_type,user_phone,img_name 
                FROM infected_report LEFT JOIN user ON infected_report.user_id = user.user_id`, function (err, result){
        if (err) {
            console.error(err);
        }
        for (var i = 0; i < result.length; i++) {
            result[i].inf_date = result[i].inf_date.toDateString();
        }
        res.json({ data: result });
    });
});
// vaccine status report
router.get('/vacctable', function (req, res){
    pool.query('SELECT app_id,app_date,vacc_name,vacc_hospital,vacc_receive, vacc_amount FROM appointment', function (err, result){
        if (err) {
            console.error(err);
        }
        for (var i = 0; i < result.length; i++) {
            result[i].app_date = result[i].app_date.toDateString();
        }
        res.json({ data: result });
    });
});
exports.appointmentRouter = router;