"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var http_1 = __importDefault(require("http"));
var socket_io_1 = require("socket.io");
var uuid_1 = require("uuid");
//@ts-expect-error
var socket_io_msgpack_parser_1 = __importDefault(require("socket.io-msgpack-parser"));
var sockets_1 = __importDefault(require("./sockets"));
var auth_1 = __importDefault(require("./auth"));
var health_1 = __importDefault(require("./health"));
var CURRENT_ED_VERSION = 1;
var auth = new auth_1.default();
var socketsHandler = new sockets_1.default(auth, CURRENT_ED_VERSION);
var healthHandler = new health_1.default(socketsHandler, 60 * 1000, 500);
var app = express_1.default();
var port = process.argv[2] || 3001;
var setAccessControlHeaders = function (req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "OPTIONS,POST,GET,PUT,DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, public-key-for-decryption, encryption-device-id, public-key-for-decryption, x-shock-hybrid-relay-id-x");
};
app.use(function (req, res, next) {
    if (req.method === "OPTIONS") {
        setAccessControlHeaders(req, res);
        res.sendStatus(204);
        return;
    }
    setAccessControlHeaders(req, res);
    next();
});
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({
    extended: true
}));
app.use(function (req, res, next) {
    var url = req.url, method = req.method;
    if (url.startsWith("/reservedHybridRelay")) {
        console.log("skipping");
        return next();
    }
    var headers = __assign({}, req.headers);
    var body = __assign({}, req.body);
    if (!headers['x-shock-hybrid-relay-id-x']) {
        console.log("missing header");
        return res.sendStatus(400);
    }
    var relayId = headers['x-shock-hybrid-relay-id-x'];
    if (typeof relayId !== 'string') {
        relayId = relayId[0];
    }
    var requestId = uuid_1.v1();
    var request = {
        body: body,
        headers: headers,
        method: method,
        relayId: relayId,
        requestId: requestId,
        url: url
    };
    socketsHandler.sendHttpRequest(request, function (err, response) {
        if (res.headersSent) {
            return;
        }
        if (err || !response) {
            return res.sendStatus(502);
        }
        if (response.result === 'error') {
            return res.status(502).write(response.message || '');
        }
        var headers = response.headers, status = response.status, body = response.body;
        Object.entries(headers).forEach(function (_a) {
            var key = _a[0], value = _a[1];
            res.set(key, value);
        });
        res.status(status).send(body);
    });
});
app.post('/reservedHybridRelayCreate', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var relayId, token, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                relayId = uuid_1.v1();
                return [4 /*yield*/, auth.generateToken(relayId)];
            case 1:
                token = _a.sent();
                res.json({ token: token, relayId: relayId });
                return [3 /*break*/, 3];
            case 2:
                e_1 = _a.sent();
                console.error(e_1);
                res.sendStatus(500);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.get('/reservedHybridRelayHealthz', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var stats, e_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, healthHandler.readStoredStatuses()];
            case 1:
                stats = _a.sent();
                res.json(stats);
                return [3 /*break*/, 3];
            case 2:
                e_2 = _a.sent();
                console.error(e_2);
                res.sendStatus(500);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
var httpServer = http_1.default.createServer(app);
var io = new socket_io_1.Server(httpServer, {
    parser: socket_io_msgpack_parser_1.default,
    transports: ['websocket', 'polling'],
    cors: {
        origin: function (origin, callback) {
            callback(null, true);
        },
        allowedHeaders: [
            'Origin',
            'X-Requested-With',
            'Content-Type',
            'Accept',
            'Authorization',
            'public-key-for-decryption',
            'encryption-device-id'
        ],
        credentials: true
    }
});
io.of(function (name, auth, next) {
    console.log(name);
    console.log(auth);
    next(null, true); // or false, when the creation is denied
}).on("connection", function (socket) {
    console.log("new connection from main" + socket.nsp.name);
    socketsHandler.addSocket(socket);
});
io.on("connection", function (socket) {
    socketsHandler.addSocket(socket);
});
var Start = function () {
    healthHandler.startHealthInterval();
    httpServer.listen(port, function () {
        console.log("Example app listening at http://localhost:" + port);
    });
};
Start();
//# sourceMappingURL=index.js.map