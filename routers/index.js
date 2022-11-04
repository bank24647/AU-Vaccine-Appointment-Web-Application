const { Router } = require('express');
const { userRouter } = require('./user');
const { articleRouter } = require('./article');
const { appointmentRouter } = require('./appointment');

const router = Router();


router.use('/user', userRouter);
router.use('/article', articleRouter);
router.use('/appointment', appointmentRouter);


exports.rootRouter = router;