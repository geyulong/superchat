'use strict';

var path = require('path');
var mysql = require(path.resolve(global.gpath.app.libs + '/mysql'));

//获取二级菜单省份，根据country
app.post('/admin/api/area/findProvinceByCountry',
    function(req, res) {
        console.log('/admin/api/area/findProvinceByCountry...');
        var country = req.body.country;
        mysql.area.findProvinceByCountry(country).then(function done(provinces) {
            console.log(provinces);
            res.status(200).send(JSON.stringify({
                ret: 0,
                data: provinces
            }));
        }, function err(err) {
            res.status(200).send(JSON.stringify({
                ret: -1,
                msg: err
            }));
        });
    });