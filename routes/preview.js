const express = require('express');
const router = express.Router();

router.get('/timestamp', function(req, res, next) {
    var redirect = req.query.redirect || '/';
    var host = req.query.vse;
    var timestamp = req.query.timestamp;
    res.cookie('amplience-host', host);
    res.cookie('timestamp', timestamp);
    res.redirect(redirect);
});

router.get('/current', function(req, res, next) {
    var redirect = req.query.redirect || '/';
    res.clearCookie('amplience-host');
    res.clearCookie('timestamp');
    res.redirect('back');
});

module.exports = router;