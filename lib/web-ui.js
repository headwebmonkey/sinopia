var fs = require('fs');
var walk = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var i = 0;
    (function next() {
      var file = list[i++];
      if (!file) return done(null, results);
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
};

function get_hostport(config) {
    // command line || config file || default
    var hostport = String(config.listen || '') || '4873'

    hostport = hostport.split(':')
    if (hostport.length < 2) {
        hostport = [undefined, hostport[0]]
    }
    if (hostport[0] == null) {
        hostport[0] = 'localhost'
    }
    return hostport
}

var sortObject = function(s){
    var keys = [];
    var t = {};
    for (k in s){
        if (s.hasOwnProperty(k))
        {
            keys.push(parseInt(k));
        }
    }

    keys.sort().reverse();

    len = keys.length;

    for (i = 0; i < len; i++){
        k = keys[i];
        t[k] = s[k];
    }
    return t;
}

var returnNAmount = function(s, n){
    var keys = [];
    var t = {};
    var count = 0;
    for (k in s){
        if (s.hasOwnProperty(k) && count < n){
            keys.push(parseInt(k));
            count ++;
        }
    }
    len = keys.length;
    for (i = 0; i < len; i++){
        k = keys[i];
        t[k] = s[k];
    }
    return t;
}

function millisecondsToStr (milliseconds) {
    // TIP: to find current time in milliseconds, use:
    // var  current_time_milliseconds = new Date().getTime();

    // This function does not deal with leap years, however,
    // it should not be an issue because the output is aproximated.

    function numberEnding (number) { //todo: replace with a wiser code
        return (number > 1) ? 's' : '';
    }

    var temp = milliseconds / 1000;
    var years = Math.floor(temp / 31536000);
    if (years) {
        return years + ' y';
    }
    var days = Math.floor((temp %= 31536000) / 86400);
    if (days) {
        return days + ' d';
    }
    var hours = Math.floor((temp %= 86400) / 3600);
    if (hours) {
        return hours + ' h';
    }
    var minutes = Math.floor((temp %= 3600) / 60);
    if (minutes) {
        return minutes + ' m';
    }
    var seconds = temp % 60;
    if (seconds) {
        return seconds + ' s';
    }
    return '1 s'; //'just now' //or other string you like;
}

module.exports = function(app) {
    app.get('/', function(req, res) {
        walk("./storage", function(err, results) {
            var packageCount = 0;
            var recentPackages = {};
            for(var i in results){
                if(results[i].indexOf(".tgz") !== -1){
                    var packageInfo = fs.statSync(results[i]);
                    var d = new Date(packageInfo.mtime);
                    var now = new Date();
                    d = d.getTime();
                    var difference = now.getTime() - d;
                    if(recentPackages[d] !== undefined){
                        d = d+""+Math.floor((Math.random()*90)+1);
                    }
                    recentPackages[d] = {
                        lastUpdated: millisecondsToStr(difference),
                        packageName: results[i].split("/")[2]
                    }
                    packageCount++;
                }
            }
            res.locals.recentPackages = returnNAmount(sortObject(recentPackages), 15);
            res.locals.packageCount = packageCount;
            res.locals.hostport = get_hostport(app.get("config"));
            res.render("index.jade");
        });
    });

    app.get('/package/:packageName', function(req, res) {
        res.locals.package = require("../storage/"+req.params.packageName+"/package.json");
        res.locals.package.currentVersion = Object.keys(res.locals.package.versions)
        res.locals.package.currentVersion = res.locals.package.currentVersion[res.locals.package.currentVersion.length - 1]
        res.locals.package.current = res.locals.package.versions[res.locals.package.currentVersion];
        res.render("packageInfo.jade");
    });

    app.get('/search', function(req, res) {
        res.locals.q = req.query.q;
        walk("./storage", function(err, results) {
            var packageCount = 0;
            var matchingPackages = {};
            for(var i in results){
                if(results[i].indexOf(".tgz") !== -1){
                    var packageName = results[i].split("/")[2];
                    if(packageName.match(new RegExp("^"+res.locals.q))){
                        packageCount++
                        var packageInfo = require("../storage/"+packageName+"/package.json")
                        var version = Object.keys(packageInfo.versions);
                        version = version[version.length - 1]
                        matchingPackages[packageName] = {
                            packageName: packageName,
                            version: version,
                            description: packageInfo.versions[version].description
                        };
                    }
                }
            }
            res.locals.matchingPackages = matchingPackages;
            console.log(matchingPackages);
            res.render("search.jade");
        });
    });
}