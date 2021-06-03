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
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var uuid_1 = require("uuid");
var node_persist_1 = __importDefault(require("node-persist"));
node_persist_1.default.init({
    dir: '.storage'
});
var Auth = /** @class */ (function () {
    function Auth() {
        var _this = this;
        this.readSecrets = function () { return __awaiter(_this, void 0, void 0, function () {
            var secrets, newSecrets;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, node_persist_1.default.getItem('auth/secrets')];
                    case 1:
                        secrets = _a.sent();
                        if (secrets) {
                            return [2 /*return*/, secrets];
                        }
                        return [4 /*yield*/, node_persist_1.default.setItem('auth/secrets', {})];
                    case 2:
                        newSecrets = _a.sent();
                        return [2 /*return*/, newSecrets];
                }
            });
        }); };
    }
    Auth.prototype.writeSecrets = function (key, value) {
        return __awaiter(this, void 0, void 0, function () {
            var allSecrets, newSecrets;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.readSecrets()];
                    case 1:
                        allSecrets = _b.sent();
                        return [4 /*yield*/, node_persist_1.default.setItem('auth/secrets', __assign(__assign({}, allSecrets), (_a = {}, _a[key] = value, _a)))];
                    case 2:
                        newSecrets = _b.sent();
                        return [2 /*return*/, newSecrets];
                }
            });
        });
    };
    Auth.prototype.generateToken = function (relayId) {
        return __awaiter(this, void 0, void 0, function () {
            var timestamp, secret, token;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!relayId) {
                            throw new Error('no relayId provided to generate token');
                        }
                        timestamp = Date.now();
                        secret = uuid_1.v1();
                        token = jsonwebtoken_1.default.sign({
                            data: {
                                timestamp: timestamp,
                                relayId: relayId
                            }
                        }, secret, { expiresIn: '1000000h' });
                        //logger.info('Saving secret...')
                        return [4 /*yield*/, this.writeSecrets(timestamp, secret)];
                    case 1:
                        //logger.info('Saving secret...')
                        _a.sent();
                        return [2 /*return*/, token];
                }
            });
        });
    };
    Auth.prototype.validateToken = function (token, relayId) {
        return __awaiter(this, void 0, void 0, function () {
            var jwtData, key, tokenRelayId, secrets, secret;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!relayId) {
                            throw new Error('no relayId provided to validate token');
                        }
                        jwtData = jsonwebtoken_1.default.decode(token).data;
                        key = jwtData.timestamp;
                        tokenRelayId = jwtData.relayId;
                        if (relayId !== tokenRelayId) {
                            throw new Error('unauthorized relayId');
                        }
                        return [4 /*yield*/, this.readSecrets()];
                    case 1:
                        secrets = _a.sent();
                        secret = secrets[key];
                        if (!secret) {
                            throw Error('invalid token provided');
                        }
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                jsonwebtoken_1.default.verify(token, secret, function (err, decoded) {
                                    if (err) {
                                        //logger.info('validateToken err', err)
                                        reject('invalid token provided');
                                    }
                                    else {
                                        // logger.info('decoded', decoded)
                                        resolve(null);
                                    }
                                });
                            })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    return Auth;
}());
exports.default = Auth;
//# sourceMappingURL=auth.js.map