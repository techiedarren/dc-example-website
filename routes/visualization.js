const Q = require('q');
const express = require('express');
const _ = require('lodash');
const router = express.Router();
const moment = require('moment');

const settings = require('../settings');
const ContentDeliveryClient = require('../cms/services/ContentDeliveryClient');
const templateService = require('../cms/services/template-service');

router.get('/', function(req, res, next) {

    var client = new ContentDeliveryClient(req.query.vse || settings.cms, settings.cmsAccount);
    var contentId = req.query.content;

    Promise.resolve([contentId])
        .then(client.getByIds.bind(client))
        .then(templateService.compileSlots)
        .then(function(slots) {
            var pageModel = {content: slots[contentId] };
            return pageModel;
        })
        .then(function(pageModel) {
            pageModel.session = {};
            pageModel.moment = moment;
            res.render('layouts/landing', pageModel);
        })
        .catch(function(err) {
            res.render('pages/error', {
                message: err.message,
                error: err
            });
        });
});

module.exports = router;
