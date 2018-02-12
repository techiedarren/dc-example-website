const Q = require('q');
const express = require('express');
const _ = require('lodash');
const router = express.Router();
const moment = require('moment');

const settings = require('../settings');
const ContentDeliveryClient = require('../cms/services/ContentDeliveryClient');
const templateService = require('../cms/services/template-service');


function registerPage(page) {
  router.get(page.route, function(req, res, next) {

    var slotMap = getSlotMap(page, req);
    var slotIds = _.values(slotMap);

    var client = new ContentDeliveryClient(req.cookies['amplience-host'] || settings.cms, settings.cmsAccount);

    Promise.resolve(slotIds)
        .then(client.getByIds.bind(client))
        .then(templateService.compileSlots)
        .then(function(slots) {

          var pageModel = {};
          for(var key in slotMap) {
            pageModel[key] = slots[slotMap[key]];
          }
          return pageModel;

        })
        .then(function(pageModel) {
          pageModel.session = req.cookies;
          pageModel.moment = moment;
          res.render('layouts/' + page.layout, pageModel);
        })
        .catch(function(err) {
          res.render('pages/error', {
            message: err.message,
              error: err
          });
        });

  });
}

function getSlotMap(page, req) {
  var keys = Object.keys(page.slots);
  var map = {};
  for(var i=0; i < keys.length; i++) {
    var key = keys[i];
    map[key] = req.query[key] || page.slots[key];
  }
  return map;
}

settings.sitemap.map(registerPage);

module.exports = router;
