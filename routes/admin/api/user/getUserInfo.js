/**
 * Created by elenahao on 15/9/7.
 */

'use strict';
var path = require('path');
var Q = require('q');
var Lazy = require('lazy.js');
var _ = require('lodash');
var request = require('request');
var http = require('http');
var redis = require(path.resolve(global.gpath.app.libs + '/redis'));

// 调取微信接口获取用户的详细信息
app.get('/admin/api/user/getInfo', function(req, res) {
    console.log("admin userInfo get...");
    var APPID = 'wx0c7c93d636ff9769';
    var APPSECRET = 'd4a38c7b7804febf8c33045005713191';
    var ACCESS_TOKEN = '';
    request({
        url: 'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid='+APPID+'&secret='+APPSECRET,
        method: 'GET'
    }, function(err, res, body) {
        if(err) console.log(err);
        if (res.statusCode === 200) {
            var _data = JSON.parse(body);
            ACCESS_TOKEN = _data.access_token;//
            console.log('access_token='+ACCESS_TOKEN);
            //从redis获取所有用户openid scan 每次获取100
            scan(ACCESS_TOKEN);
        }
    });
    res.send('get user success');
});

function scan(ACCESS_TOKEN) {
    var dfd = Q.defer();
    var cursor = '0';

    function _scan(ACCESS_TOKEN){
        redis.client.scan(
            cursor,
            'match', 'user:*',
            'count', '1',
            function(err, res) {
                var user_list = new Array();
                cursor = res[0];
                if(res[1].length > 0){
                    console.log(res[1]);
                    Lazy(res[1]).each(function(uid){
                        console.log('uid='+uid);
                        var _data = {
                            openid: uid.split(':')[1],
                            lang: "zh-CN"
                        }
                        user_list.push(_data);
                    });
                    console.log(JSON.stringify({user_list: user_list}));
                    console.log('ACCESS_TOKEN='+ACCESS_TOKEN);
                    var url = 'https://api.weixin.qq.com/cgi-bin/user/info/batchget?access_token='+ACCESS_TOKEN+'&user_list='+JSON.stringify(user_list);
                    console.log(url);
                    request({
                        url: 'https://api.weixin.qq.com/cgi-bin/user/info/batchget?access_token='+ACCESS_TOKEN,//+'&user_list='+JSON.stringify({user_list: user_list}),
                        body: JSON.stringify({user_list: user_list}),
                        method: 'POST'
                    }, function(err, res, body) {
                        if(err) console.log(err);
                        console.log('======'+body);
                        if (res.statusCode === 200) {
                            console.log('success');
                            //存入redis
                            var _body = JSON.parse(body);
                            console.log(_body);
                            var user_info_list = _body.user_info_list;
                            for(var i = 0; i< user_info_list.length; i++){
                                var options = user_info_list[i];
                                var openid = options.openid;
                                redis.hmset('user:'+openid, options)
                                    .then(function resolve(res) {
                                        console.log('is set ok:', res);
                                    }, function reject(err) {
                                        dfd.reject(err);
                                    })
                            }
                        }
                    });
                }
                if (cursor == 0) {
                    dfd.resolve(res);
                } else {
                    _scan(ACCESS_TOKEN);
                }
            }
        );
    }
    _scan(ACCESS_TOKEN);

    return dfd.promise;
}