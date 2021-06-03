import express from 'express'
import Http from 'http'
import {Server} from 'socket.io'
import {v1} from 'uuid'
//@ts-expect-error
import binaryParser from 'socket.io-msgpack-parser'
import SocketsHandler from './sockets'
import Auth from './auth'
import { httpRequestInfo } from './types'
const auth = new Auth()
const socketsHandler = new SocketsHandler(auth)
const app = express()
const port = 3000

const setAccessControlHeaders = (req:any, res:any) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "OPTIONS,POST,GET,PUT,DELETE")
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization, public-key-for-decryption, encryption-device-id, public-key-for-decryption, x-shock-hybrid-relay-id-x"
    );
};
app.use((req, res, next) => {
    if (req.method === "OPTIONS") {
        setAccessControlHeaders(req, res);
        res.sendStatus(204);
        return;
    }

    setAccessControlHeaders(req, res);
    next();
})
app.use(express.json())
app.use(express.urlencoded({
    extended:true
}))

app.use(function (req, res, next) {
    const {url,method} = req
    if(url.startsWith("/reservedHybridRelay")){
        console.log("skipping")
        return next()
    }
    const headers = {...req.headers}
    const body = {...req.body}
    if(!headers['x-shock-hybrid-relay-id-x']){
        console.log("missing header")
        return res.sendStatus(400)
    }
    let relayId = headers['x-shock-hybrid-relay-id-x']
    if(typeof relayId !== 'string'){
        relayId = relayId[0]
    }
    const requestId = v1()
    const request:httpRequestInfo = {
        body,
        headers,
        method,
        relayId,
        requestId,
        url
    }
    socketsHandler.sendHttpRequest(request,(err,response) => {
        if(res.headersSent){
            return
        }
        if(err || !response){
            return res.status(502)
        }
        if(response.result === 'error'){
            return res.status(502).write(response.message || '')
        }
        const {headers,status,body} = response
        Object.entries(headers).forEach(([key,value]) => {
            res.set(key,value as string | string[] | undefined)
        })
        res.status(status).send(body)
    })
})

app.post('/reservedHybridRelayCreate',async (req,res) => {
    try {
        const relayId = v1()
        const token = await auth.generateToken(relayId)
        res.json({token,relayId})
    }catch(e){
        console.error(e)
        res.sendStatus(500)
    }
})


const httpServer = Http.createServer(app)
const io = new Server(httpServer,{
    parser: binaryParser,
    transports: ['websocket', 'polling'],
    cors: {
        origin: (origin:any, callback:any) => {
            callback(null, true)
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
})

io.of((name, auth, next) => {
    console.log(name)
    console.log(auth)
    next(null, true); // or false, when the creation is denied
}).on("connection",socket => {
    socketsHandler.addSocket(socket)
})
io.on("connection",socket => {
    socketsHandler.addSocket(socket)
})


const Start = () => {
    
    httpServer.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`)
    })
}

Start()