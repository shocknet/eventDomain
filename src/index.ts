import express from 'express'
import Http from 'http'
import {Server} from 'socket.io'
import {v1} from 'uuid'
//@ts-expect-error
import binaryParser from 'socket.io-msgpack-parser'
import SocketsHandler from './sockets'
import Auth from './auth'
import Health from './health'
import { httpRequestInfo } from './types'
import path from 'path'

const CURRENT_ED_VERSION = 1
const auth = new Auth()
const socketsHandler = new SocketsHandler(auth,CURRENT_ED_VERSION)
const healthHandler = new Health(socketsHandler,60*1000,500) 

const app = express()
const port = process.argv[2] || 3001

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
    let relayId = ""
    if(headers['x-shock-hybrid-relay-id-x']){
        const relayIdHeader = headers['x-shock-hybrid-relay-id-x']
        if(typeof relayIdHeader !== 'string'){
            relayId = relayIdHeader[0]
        } else {
            relayId = relayIdHeader
        }
    }else if(req.query["x-shock-hybrid-relay-id-x"]){
        const relayIdParam = req.query['x-shock-hybrid-relay-id-x']
        if(typeof relayIdParam === 'string'){
            relayId = relayIdParam
        }
    }
    if(relayId === ""){
        console.log("missing relayId")
        return res.sendStatus(400)
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
            return res.sendStatus(502)
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
        const [token,relayId] = await auth.generateToken()
        res.json({token,relayId})
    }catch(e){
        console.error(e)
        res.sendStatus(500)
    }
})

app.get('/reservedHybridRelayHealthz',async (req,res) => {
    try {
        const stats = await healthHandler.readStoredStatuses()
        res.json(stats)
    }catch(e){
        console.error(e)
        res.sendStatus(500)
    }
})

app.get('/reservedHybridRelayHealthzUI',async (req,res) => {
    try {
        res.sendFile(path.join(__dirname, './public/index.html'))
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
    console.log("new connection from main"+socket.nsp.name)
    socketsHandler.addSocket(socket)
})
io.on("connection",socket => {
    socketsHandler.addSocket(socket)
})


const Start = () => {
    healthHandler.startHealthInterval()
    httpServer.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`)
    })
}

Start()