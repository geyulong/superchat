/**
 * Created by elenahao on 15/10/16.
 */

var fs = require('fs');

var ws = fs.createWriteStream('./f.txt',{ flags: 'a', defaultEncoding: 'utf8'});

var body = '{"user_info_list":[{"subscribe":1,"openid":"o0aT-d-3qKHaoDXMz4WJLaQJgcHM","nickname":"lЧь。\\\,"sex":1,"language":"zh_CN","city":"","province":"","country":"刚果民主共和国","headimgurl":"http:\\/\\/wx.qlogo.cn\\/mmopen\\/n9UUU8c5lXZSEwcETXkLW40H6bPKyX5cibvR0NSMVuziawv2zjn8V2C85HGOOgtd8lDm1wIOrfR9oSsibXEg7WjibTHH3SWiayABG\\/0","subscribe_time":1437279875,"unionid":"owJ__t_Zm6pdjpD4kzZtGAEpH2xw","remark":"","groupid":0}]}';

var b = ws.write(body,function(){

});

console.log(b);

ws.end('\n');
