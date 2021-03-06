'use strict'
var path = require('path');
var Q = require('q');
var Lazy = require('lazy.js');
var _ = require('lodash');
var request = require('request');
var mysql = require(path.resolve(global.gpath.app.libs + '/mysql'));
var Token = require(path.resolve(global.gpath.app.model + '/common/token'));

app.get('/admin/api/batchUpdate/user',
    function(req, res) {
    var dfd = Q.defer();
    //1-取一个未跑定时的组（按组号orderby）
    //2-取这个组下需要跑的用户，分组分quartz取，一次取该quartz的50个
    //3-每次将这50个数据进行update
    //4-全部更新成功后，将对应的is_quartz改为1，再重复从2开始
    //5-如果全部quartz更新完，就将这个组的is_quartz改为1，再重复从1开始
    //6-如果全部组更新完，over
    var groupId = 0;
    mysql.groupQuartz.getGroupNotQuartz().then(function done(ret){
        console.log('is get group ok:', ret);
        if(ret.length > 0){
            //取到了一个未跑定时的组
            groupId = ret[0].id;
            console.log('groupid:', ret[0].id);
            return mysql.groupQuartz.getQuartzByGroupId(groupId);
        }else{
            //已经没有未跑定时的组了，可以结束了
            console.log('group update over...');
            dfd.resolve('group update over...');
        }
    }, function err(err){
        dfd.reject({err: err});
    }).then(function done(ret){
        console.log('is get quartz ok:', ret);
        if(ret){
            var quartz_array = [];
            for(var i = 0; i < ret.length; i++){
                var quartz = ret[i];
                handle(quartz);
                quartz_array.push(quartz);
            }
            Q.all(quartz_array).then(function done(ret){
                //更新group表将is_quartz改为1
            }, function err(err){
                dfd.reject({err: err});
            })
        }else{
            //更新group表将is_quartz改为1
        }
    }, function err(err){
        dfd.reject({err: err});
    })

});

function handle(quartz){
    var dfd = Q.defer();
    var cursor = 0;
    console.log('in handle quartz:', quartz);
    function _handle(){
        if(quartz && quartz.city){
            //精确到城市
            console.log('in quartz.city');
            mysql.groupQuartz.queryUsersByCity(cursor, 50, quartz).then(function done(ret){
                //根据quartz的条件，查询出50个，调用_request()
                console.log('is queryUsersByCity ok:', ret);
                if(ret && ret.length > 0){
                    _request(cursor, 50, ret);
                    cursor ++;
                    _handle();
                }
            }, function err(err){
                dfd.reject({err: err});
            })
        }else{
            //精确到省份（北京，天津，上海，重庆等）
            mysql.groupQuartz.queryUsersByProvince(cursor, 50, quartz).then(function done(ret){
                //根据quartz的条件，查询出50个，调用_request()
                console.log('is queryUsersByProvince ok:', ret);
                if(ret && ret.length > 0){
                    _request(ret);
                    cursor ++;
                    _handle();
                }
            }, function err(err){
                dfd.reject({err: err});
            })
        }
    }
    _handle();
}

var _request = function(options){
    var dfd = Q.defer();
    var ACCESS_TOKEN = '';
    Token.getAccessToken().then(function resolve(res) {
        if (res.access_token) {
            for (var i = 0; i < options.length; i++) {
                //{"openid_list":["oDF3iYx0ro3_7jD4HFRDfrjdCM58","oDF3iY9FGSSRHom3B-0w5j4jlEyY"],"to_groupid":108}
                //先获取ACCESS_TOKEN
                var opt = options[i];
                console.log(res.access_token);
                console.log('options=', JSON.stringify(opt));
                ACCESS_TOKEN = res.access_token;
                request({
                    url: 'https://api.weixin.qq.com/cgi-bin/groups/members/batchupdate?access_token=' + ACCESS_TOKEN,
                    method: 'POST',
                    body: JSON.stringify(opt)
                }, function (err, res, body) {
                    console.log('is request get ok:', body);
                });
            }
        }
    }, function reject(err) {
        dfd.reject({err: err});
    })
}
