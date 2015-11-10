'use strict';
var path = require('path');
var Q = require('q');
var Lazy = require('lazy.js');
var _ = require('lodash');
var request = require('request');
var redis = require(path.resolve(global.gpath.app.libs + '/redis'));
var mysql = require(path.resolve(global.gpath.app.libs + '/mysql'));
var Token = require(path.resolve(global.gpath.app.model + '/common/token'));

//上传图文消息，获取media_id
app.post('/admin/api/mass/uploadMsg',
    function(req, res) {
        console.log('/admin/api/mass/uploadMsg...');
        console.log(req.query.msg_id);
        console.log(req.query.title);
        console.log(req.query.content);
        console.log(req.query.show_cover_pic);
        //req.sanitize('msg_id').trim();
        //req.sanitize('msg_id').escape();
        //req.sanitize('title').trim();
        //req.sanitize('title').escape();
        //req.sanitize('content').trim();
        //req.sanitize('content').escape();
        //req.sanitize('show_cover_pic').trim();
        //req.sanitize('show_cover_pic').escape();
        ////验证
        //req.checkBody('msg_id', 'empty').notEmpty().isInt();
        //req.checkBody('title', 'empty').notEmpty();
        //req.checkBody('content', 'empty').notEmpty();
        //req.checkBody('show_cover_pic', 'empty').notEmpty().isInt();
        //var errors = req.validationErrors();
        //console.log('err:',errors);

        //if (errors) {
        //    res.status(400).send(JSON.stringify({
        //        ret: -1,
        //        msg: errors
        //    }));
        //}else{
            //验证通过
            console.log('msg_id:',req.query.msg_id);
            mysql.mass.queryThumbById(req.query.msg_id).then(function done(ret){
                console.log('is queryThumb ok:', ret);
                console.log(ret[0].thumb_media_id);
                var thumb_media_id = ret[0].thumb_media_id;
                console.log(thumb_media_id);
                _upload(res, req.query, thumb_media_id)
            }, function err(err){
                res.status(400).send(JSON.stringify({
                    ret: -1,
                    msg: err
                }));
            });
        //}
    });

function _upload(res, query, thumb_media_id){
    console.log('query', JSON.stringify(query));
    console.log('query.title:'+query.title);
    //var _query = JSON.parse(query);
    Token.getAccessToken().then(function done(ret) {
        if (ret.access_token) {
            var art = [];
            var opt = {
                title: query.title,
                thumb_media_id: thumb_media_id,
                author: query.author,
                digest: query.digest,
                show_cover_pic: query.show_cover_pic,
                content: query.content,
                content_source_url: ''
            }
            art.push(opt);
            //art.push(opt);
            console.log(JSON.stringify({articles: art}));
            request({
                url: 'https://api.weixin.qq.com/cgi-bin/media/uploadnews?access_token='+ret.access_token,
                body: JSON.stringify({articles: art}),
                method: 'POST'
            }, function(err, _res, body) {
                var _body = JSON.parse(body);
                console.log(_body);
                console.log(_body.media_id);
                console.log(_body.created_at);
                if(_body.errcode && _body.errcode == 40001){
                    redis.del('access_token').then(function resolve(ret) {
                        console.log('is del ok:', ret);
                        return _upload(query, thumb_media_id);
                    }, function reject(err) {
                        res.status(200).send(JSON.stringify({
                            ret: -1,
                            msg: err
                        }));
                    });
                }else if(_body.errcode && _body.errcode == 45009){
                    res.status(200).send(JSON.stringify({
                        ret: -1,
                        msg: _body
                    }));
                }else{
                    if(_body.media_id && _body.created_at){
                        var msg = {
                            id: query.msg_id,
                            author: query.author,
                            title: query.title,
                            content: query.content,
                            digest: query.digest,
                            show_cover_pic: query.show_cover_pic,
                            media_id: _body.media_id,
                            media_created_time: _body.created_at
                        }
                        mysql.mass.saveMsg(msg).then(function done(ret){
                            console.log('is mysql save msg ok:', ret);
                            res.status(200).send(JSON.stringify({
                                ret: -1,
                                msg: '保存成功'
                            }));
                        }, function err(err){
                            res.status(400).send(JSON.stringify({
                                ret: -1,
                                msg: err
                            }));
                        })
                    }
                }
            });

        }
    }, function err(err){
        res.status(400).send(JSON.stringify({
            ret: -1,
            msg: err
        }));
    });
}
