var express = require('express');
var router = express.Router();
var httpRequest = require('request');
var apiKeyGen = require("apikeygen").apikey;

var db = require('../../utils/handlers/user');
var formParser = require('../../utils/form-parser.js');
var User = require('../../utils/models/user');
var Keys = require('../../utils/models/keys');

router.use(function(req, res, next) {
    console.log(req.url);
    if(req.url == '/') return next();
    if(!req.query.apiKey) return res.send({error:"API KEY not provided."});
    Keys
    .findOne({apiKey:req.query.apiKey})
    .exec((err, key) => {
        if(!key) return res.send({error:"Invalid API KEY provided."});
        key.invokes++;
        key.stats.push({
            time:new Date(),
            request:req
        })
        key.save((err, done) => {
            if(err) return res.send({error:"Some internal error."});
            req.apiKey = key;
            next();
        })
    })
});

router.get('/', function(req, res, next) {
	res.render('dev/index', {
		title: req.app.conf.name,
		error:false
	});
})

router.get('/userInfo', function(req, res, next) {
    if(req.query.username) {
        User
        .findOne({username:req.query.username})
        .exec((err, userDetails) => {
            if(!userDetails) return res.status(404)
            var profile_picture = "https://spruce.divy.work"+userDetails.profile_picture
            var toBeSent = {
                username:userDetails.username,
                profile_picture:profile_picture,
                dob:userDetails.dob,
                bio:userDetails.bio,
                firstname:userDetails.firstname,
                lastname:userDetails.lastname
            }
            res.status(200).send(JSON.stringify(toBeSent, null, 2));
        })
    }
});

router.post('/generate', function(req, res, next) {
    genAPIKey((status) => {
        if(!status) return res.send({error:"Some internal error. Please try again."});
        res.send({apikey:status.apiKey});
    })
});

function genAPIKey(cb) {
    var key = apiKeyGen();
    console.log(key);
    Keys.findOne({apiKey:key}).exec((err, dbKey) => {
        if(dbKey) return cb(false);
        var newKey = new Keys({
            apiKey:key,
            stats:[],
            invokes:0
        });
        newKey.save((err, done) => {
            cb(done);
        })
    })
}
module.exports = router;
