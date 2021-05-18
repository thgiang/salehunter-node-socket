const redis_host = process.env.REDIS_HOST || "45.32.108.186"
const redis_pass = process.env.REDIS_PASS || ""
const redis_port = process.env.REDIS_PORT || 6379
const laravel_url = process.env.LARAVEL_URL || 'http://localhost:8000'
const encrypt_salt = 'GHTAK65JS' // Nếu sửa thì phải sửa ở cả dòng laravel App\Helpers\Global.php

const io = require("socket.io")(8080, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
var md5 = require('md5');
var axios = require('axios');
var redis = require('redis');

var channel = ''
// middleware
io.use(async (socket, next) => {
  let token = socket.handshake.query.token;
  if (!token) {
	return next(new Error('Token are required'));
  }
  
	let response = await axios.get(laravel_url + '/api/user?token='+token).catch(() => {
		return next(new Error('Fail to validate token'));
	});

	if (response && response.data) {
		channel = md5(response.data.id + encrypt_salt);
		return next();
	} else {
		return next(new Error('Invalid token'));
	}
 
});

// socket
io.on('connection', function (socket) {
 // var redisClient = redis.createClient({host: redis_host, password: redis_pass, port: redis_port});
  var redisClient = redis.createClient();
  redisClient.subscribe(channel);

  redisClient.on("message", function(channel, message) {
	try {
        const data = JSON.parse(message);
		socket.emit(data.type, data);
    } catch (e) {
		console.log(e);
        socket.emit('message', message);
    }
   
  });

  socket.on('disconnect', function() {
    redisClient.quit();
  });

});
