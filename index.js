const http = require("http");
const url = require("url");
const cryptoJS = require("crypto-js");
const fs = require("fs");

//服务端口
const port = 3628;

//加密后的密钥
const keys = {};

//密钥源数据
const rawKeys = {};

//配置
const config = require('./config.json');

//随机密码生成器
const createPwd = (len) => {
    try {
        let randomStr = '';
        let material = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
        for(let i = 0;i < len;i++) {
            randomStr += material[parseInt(Math.random() * 61)];
        }
        return randomStr;
    }
    catch(err) {
        throw err;
    }
}

console.log('\n key manager v1.0.0\n');

//读取证书
for(const key in config) {
    rawKeys[key] = fs.readFileSync(`./keys/${config[key]}`, 'utf-8');
    if(!rawKeys[key])
        console.log(` ${key} key not found`);
    else
        console.log(` ${key} key loaded`);
}

//加密证书
const encryptKeys = (pwd)  => {
    for(const key in rawKeys) {
        const data = cryptoJS.enc.Utf8.parse(rawKeys[key]);
        const _key = cryptoJS.enc.Utf8.parse(pwd);
        const _data = cryptoJS.AES.encrypt(data, _key, { mode: cryptoJS.mode.ECB, padding: cryptoJS.pad.Pkcs7 });
        keys[key] = _data.toString();
        console.log(` ${key} key encrypted`);
    }
}

//生成密码
let pwd = createPwd(16);

//生成密码并加密
encryptKeys(pwd);

//创建HTTP服务
http.createServer((req, res) => {
    if(url.parse(req.url).path=='/favicon.ico') {
        res.writeHead(404);
        res.end();
        return;
    }
    res.writeHead(200, {'Content-Type': 'application/json'});
    const params = url.parse(req.url, true).query;
    const errText = '{"status":"failed","code":"-22","msg":"key not found"}';
    if(!params || !params.key) {
        console.error('key not found', params);
        res.end(errText);
        return;
    }
    const names = params.key.split(',');
    const retuenData = {};
    for(let name of names) {
        if(!keys[name]) {
            console.error('key not found', params);
            return res.end(errText);
        }
        retuenData[name] = keys[name];
    }
    res.end(JSON.stringify({status: "successfully", data: retuenData}));
    //重新加密密钥
    pwd = createPwd(16);
    encryptKeys(pwd);
    console.log('\n key manager reset successfully')
    console.log(`\n auth code: [${pwd}]\n`);
}).listen(port);

console.log(`\n key manager start successfully\n port number to listen on ${port}`);
console.log(`\n auth code: [${pwd}]\n`);