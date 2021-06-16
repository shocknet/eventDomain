"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var uuid_1 = require("uuid");
var Handler = /** @class */ (function () {
    function Handler(authHelper, version) {
        this.receiversSockets = {};
        this.sendersSockets = {};
        this.httpCallbacks = {};
        this.socketCallbacks = {};
        this.auth = authHelper;
        this.currentVersion = version;
    }
    Handler.prototype.addSocket = function (socket) {
        var namespace = socket.nsp.name;
        if (namespace === "/reservedHybridRelayNamespace") {
            this.addReceiverSocket(socket);
        }
        else {
            this.addViewerSocket(socket);
        }
    };
    Handler.prototype.addViewerSocket = function (socket) {
        var _this = this;
        socket.once("hybridRelayId", function (body) {
            if (!body || !body.id) {
                socket.emit("relay:error", { type: 'error', message: '' });
                socket.disconnect();
                return;
            }
            var relayId = body.id;
            _this.placeViewerSocket(relayId, socket);
        });
    };
    Handler.prototype.placeViewerSocket = function (relayId, socket) {
        var _this = this;
        if (!this.receiversSockets[relayId]) {
            socket.emit("relay:error", { message: 'no listener for provided relayId' });
            socket.disconnect();
            return;
        }
        if (!this.sendersSockets[relayId]) {
            this.sendersSockets[relayId] = {};
        }
        var namespace = socket.nsp.name;
        if (!this.sendersSockets[relayId][namespace]) {
            this.sendersSockets[relayId][namespace] = {};
        }
        var deviceId = socket.handshake.auth.encryptionId;
        if (!this.sendersSockets[relayId][namespace][deviceId]) {
            this.sendersSockets[relayId][namespace][deviceId] = [];
        }
        this.sendersSockets[relayId][namespace][deviceId].push(socket);
        var newSocketMessage = {
            type: 'socketNew',
            namespace: namespace,
            deviceId: deviceId
        };
        this.receiversSockets[relayId].emit('relay:internal:newSocket', newSocketMessage);
        socket.onAny(function (eventName, eventBody, callback) {
            //console.log("propagating: "+eventName)
            var queryId = uuid_1.v1();
            var message = {
                type: 'socketEvent',
                eventName: eventName,
                eventBody: eventBody,
                namespace: namespace,
                queryCallbackId: queryId,
                socketCallbackId: socket.id,
                deviceId: deviceId
            };
            if (!_this.socketCallbacks[socket.id]) {
                _this.socketCallbacks[socket.id] = {};
            }
            _this.socketCallbacks[socket.id][queryId] = callback;
            _this.receiversSockets[relayId].emit('relay:internal:messageForward', message);
        });
        socket.on('disconnect', function () {
            var socketIndex = _this.sendersSockets[relayId][namespace][deviceId].indexOf(socket);
            if (socketIndex !== -1) {
                _this.sendersSockets[relayId][namespace][deviceId].splice(socketIndex, 1);
            }
            delete _this.socketCallbacks[socket.id];
        });
    };
    Handler.prototype.addReceiverSocket = function (socket) {
        var _this = this;
        socket.once("hybridRelayToken", function (body, ack) { return __awaiter(_this, void 0, void 0, function () {
            var token, relayId, version, ok, connectedSockets_1, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!body || !body.token || !body.id || !body.version) {
                            socket.emit("relay:internal:error", { type: 'error', message: 'invalid token' });
                            socket.disconnect();
                            return [2 /*return*/];
                        }
                        token = body.token, relayId = body.id, version = body.version;
                        if (this.currentVersion !== version) {
                            socket.emit("relay:internal:error", { type: 'error', message: 'invalid version' });
                            socket.disconnect();
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.auth.validateToken(token, relayId)];
                    case 2:
                        ok = _a.sent();
                        if (!ok) {
                            socket.emit("relay:error", { type: 'error', message: '' });
                            socket.disconnect();
                            return [2 /*return*/];
                        }
                        connectedSockets_1 = [];
                        Object.entries(this.sendersSockets[relayId] || {}).forEach(function (_a) {
                            var namespace = _a[0], socketDevices = _a[1];
                            Object.entries(socketDevices || {}).forEach(function (_a) {
                                var deviceId = _a[0], sockets = _a[1];
                                if (sockets.find(function (socket) { return socket.connected; })) {
                                    connectedSockets_1.push({
                                        deviceId: deviceId,
                                        namespace: namespace
                                    });
                                }
                            });
                        });
                        ack(connectedSockets_1);
                        this.placeReceiverSocket(relayId, socket);
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        socket.emit("relay:error", { type: 'error', message: '' });
                        socket.disconnect();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
    };
    Handler.prototype.placeReceiverSocket = function (relayId, socket) {
        var _this = this;
        socket.on('relay:internal:messageBackward', function (body) {
            if (!body || !body.type || body.type !== 'socketEvent' || !body.namespace || !body.eventName) {
                socket.emit("relay:internal:error", { type: 'error', message: '' });
                //socket.disconnect()
                return;
            }
            //console.log(`got backward on ${body.namespace} for ${body.eventName}`)
            if (!_this.sendersSockets[relayId] ||
                !_this.sendersSockets[relayId][body.namespace] ||
                !_this.sendersSockets[relayId][body.namespace][body.deviceId]) {
                return;
            }
            // TODO counter and notify if no one is listening
            var sent = 0;
            for (var i = 0; i < _this.sendersSockets[relayId][body.namespace][body.deviceId].length; i++) {
                if (!_this.sendersSockets[relayId][body.namespace][body.deviceId][i]) {
                    console.log("nopping");
                    return;
                }
                //console.log("emitting to client: "+body.eventName)
                _this.sendersSockets[relayId][body.namespace][body.deviceId][i].emit(body.eventName, body.eventBody);
                sent++;
            }
        });
        socket.on('relay:internal:httpResponse', function (body) {
            if (!body || body.type !== 'httpResponse') {
                return;
            }
            var relayId = body.relayId, requestId = body.requestId;
            if (!_this.httpCallbacks[relayId] || !_this.httpCallbacks[relayId][requestId]) {
                return;
            }
            _this.httpCallbacks[relayId][requestId](null, body);
            delete _this.httpCallbacks[relayId][requestId];
        });
        socket.on('relay:internal:ackFromServer', function (body) {
            if (!body || body.type !== 'ack') {
                return;
            }
            console.log("got server ack... sending..");
            var queryId = body.queryId, socketId = body.socketId, error = body.error, response = body.response;
            if (_this.socketCallbacks[socketId]) {
                if (_this.socketCallbacks[socketId][queryId]) {
                    _this.socketCallbacks[socketId][queryId](error, response);
                }
            }
        });
        socket.on('relay:internal:error', function (err) {
            console.error(err);
        });
        if (this.receiversSockets[relayId]) {
            if (this.receiversSockets[relayId].connected) {
                this.receiversSockets[relayId].disconnect(true); //TODO verify this is the correct way to go
            }
            delete this.receiversSockets[relayId];
        }
        this.receiversSockets[relayId] = socket;
    };
    Handler.prototype.sendHttpRequest = function (req, cb) {
        var relayId = req.relayId, requestId = req.requestId, body = req.body, headers = req.headers, method = req.method, url = req.url;
        if (!this.httpCallbacks[relayId]) {
            this.httpCallbacks[relayId] = {};
        }
        if (!this.receiversSockets[relayId] /*|| !this.receiversSockets[relayId].connected*/) {
            cb({
                type: 'error',
                message: ''
            }, null);
            return;
        }
        var httpReqMessage = {
            type: 'httpRequest',
            relayId: relayId,
            requestId: requestId,
            body: body,
            headers: headers,
            method: method,
            url: url,
        };
        this.receiversSockets[relayId].emit('relay:internal:httpRequest', httpReqMessage);
        this.httpCallbacks[relayId][requestId] = cb;
    };
    return Handler;
}());
exports.default = Handler;
//# sourceMappingURL=sockets.js.map