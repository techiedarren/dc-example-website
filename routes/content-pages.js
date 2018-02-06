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


/*const settings = require('../services/settings');
const content = require('../services/content-generator');

const moment = require('moment');

function generatePage(req, res, page) {

  var theme = settings.get('theme', req);
  var contentTemplate = settings.get('template', req);

  var options = {
    host: settings.get('amplience-host', req, page.site),
    endpoint: settings.get('endpoint', req, page.site),
    cache: settings.get('cache', req) === 'false'
  };

  var slots = Object.keys(page.slots);
  var promises = slots.map(function(slot) {
    return content.generateHtml(page.slots[slot], contentTemplate, options)
  });
  promises.push(themes.getTheme(theme, options));

  Q.allSettled(promises).then(function(results) {

    var pageData = {};

    for(var i=0; i < results.length; i++){
      var result = results[i];
      if (result.state != "fulfilled") {
        throw new Error(result.reason);
      }else{
        var isSlot = i < slots.length;

        if(isSlot) {
          pageData[slots[i]] = result.value;
        }else{
          pageData.header = result.value.header;
          pageData.footer = result.value.footer;
        }
      }
    }

    pageData.session = req.cookies;
    pageData.moment = moment;

    res.render('layouts/' + page.layout, pageData);
  }, function(err){

  });
}

sitemap.forEach(function (page) {
    router.get(page.route, function(req, res, next) {
        generatePage(req, res, page);
    });
});*/

module.exports = router;
