
import type {Socket} from 'socket.io'
import {v1} from 'uuid'
import Auth from './auth'
import { 
    ExistingSockets,
    httpRequestInfo, 
    RelayErrorMessage, 
    RelayMessageEvent, 
    RelayMessageHttpRequest, 
    RelayMessageHttpResponse, 
    RelayMessageNewSocket, 
    RelayMessageSocketAck 
} from './types'
export default class Handler {
    constructor(authHelper:Auth){
        this.auth = authHelper
    }
    auth:Auth
    receiversSockets:Record<string/*relayId*/,Socket> = {}

    sendersSockets:Record<string/*relayId*/,Record<string/*namespace*/,Socket[]>> = {}

    httpCallbacks:Record<string/*relayId*/,Record<string/*requestId*/,(err:RelayErrorMessage|null,res:RelayMessageHttpResponse|null)=>void>> = {}
    socketCallbacks:Record<string/*socketId*/,Record<string/*requestId*/,(err:any,res:any)=>void>> = {}

    addSocket(socket:Socket){
        const {name:namespace} = socket.nsp
        if(namespace ==="/reservedHybridRelayNamespace"){
            this.addReceiverSocket(socket)
        } else {
            this.addViewerSocket(socket)
        }
    }

    addViewerSocket(socket:Socket){
        socket.once("hybridRelayId", body =>{
            if(!body || !body.id){
                socket.emit("relay:error",{type:'error',message:''})
                socket.disconnect()
                return
            }
            const {id:relayId} = body
            this.placeViewerSocket(relayId,socket)
        })
    }

    placeViewerSocket(relayId:string, socket:Socket) {
        
        if(!this.receiversSockets[relayId]){
            socket.emit("relay:error",{message:'no listener for provided relayId'})
            socket.disconnect()
            return
        }

        if(!this.sendersSockets[relayId]){
            this.sendersSockets[relayId] = {}
        }
        const {name:namespace} = socket.nsp
        if(!this.sendersSockets[relayId][namespace]){
            this.sendersSockets[relayId][namespace] = []
        }
        this.sendersSockets[relayId][namespace].push(socket)
        const newSocketMessage:RelayMessageNewSocket = {
            type:'socketNew',
            namespace,
            deviceId:socket.handshake.auth.encryptionId
        } 
        this.receiversSockets[relayId].emit('relay:internal:newSocket',newSocketMessage)
        socket.onAny((eventName:string,eventBody:any,callback:(err:any,res:any)=>void) =>{
            //console.log("propagating: "+eventName)
            const queryId = v1()
            const message:RelayMessageEvent = {
                type:'socketEvent',
                eventName,
                eventBody,
                namespace,
                queryCallbackId:queryId,
                socketCallbackId:socket.id
            }
            if(!this.socketCallbacks[socket.id]){
                this.socketCallbacks[socket.id] = {}
            }
            this.socketCallbacks[socket.id][queryId] = callback
            this.receiversSockets[relayId].emit('relay:internal:messageForward',message)
        })
        socket.on('disconnect',() => {
            const socketIndex = this.sendersSockets[relayId][namespace].indexOf(socket)
            if(socketIndex !== -1){
                this.sendersSockets[relayId][namespace].splice(socketIndex,1)
            }
            delete this.socketCallbacks[socket.id]
        })
    }


    addReceiverSocket(socket:Socket){
        socket.once("hybridRelayToken", async (body, ack:(sockets:ExistingSockets[])=>void) => {
            if(!body || !body.token || !body.id){
                socket.emit("relay:internal:error",{type:'error',message:''})
                socket.disconnect()
                return
            }
            const {token,id:relayId} = body
            try{
                const ok = await this.auth.validateToken(token,relayId)
                if(!ok){
                    socket.emit("relay:error",{type:'error',message:''})
                    socket.disconnect()
                    return
                }
                const connectedSockets:ExistingSockets[] = []
                Object.entries(this.sendersSockets[relayId] || {}).forEach(([namespace,sockets])=>{
                    sockets.forEach(socket =>{
                        connectedSockets.push({
                            deviceId:socket.handshake.auth.encryptionId,
                            namespace
                        })
                    })
                })
                ack(connectedSockets)
                this.placeReceiverSocket(relayId,socket)
            } catch(e) {
                socket.emit("relay:error",{type:'error',message:''})
                socket.disconnect()
            }

        })
    }

    placeReceiverSocket(relayId:string, socket:Socket){
        socket.on('relay:internal:messageBackward',(body:RelayMessageEvent) =>{
            if(!body || !body.type || body.type !== 'socketEvent' || !body.namespace || !body.eventName){
                socket.emit("relay:internal:error",{type:'error',message:''})
                //socket.disconnect()
                return
            }
            //console.log(`got backward on ${body.namespace} for ${body.eventName}`)
            if(!this.sendersSockets[relayId] || !this.sendersSockets[relayId][body.namespace]){
                return
            }
            // TODO counter and notify if no one is listening
            let sent = 0
            for(let i = 0;i<this.sendersSockets[relayId][body.namespace].length;i++){
                if(!this.sendersSockets[relayId][body.namespace][i]){
                    console.log("nopping")
                    return
                }
                //console.log("emitting to client: "+body.eventName)
                this.sendersSockets[relayId][body.namespace][i].emit(body.eventName,body.eventBody)
                sent++
            }
            
        })
        socket.on('relay:internal:httpResponse',(body:RelayMessageHttpResponse) =>{
            if(!body || body.type !== 'httpResponse'){
                return 
            } 
            const {relayId,requestId} = body
            if(!this.httpCallbacks[relayId] || !this.httpCallbacks[relayId][requestId]){
                return
            }
            this.httpCallbacks[relayId][requestId](null,body)
            delete this.httpCallbacks[relayId][requestId]
        })
        socket.on('relay:internal:ackFromServer',(body:RelayMessageSocketAck) => {
            if(!body || body.type !== 'ack'){
                return 
            } 
            console.log("got server ack... sending..")
            const {queryId,socketId,error,response} = body
            if(this.socketCallbacks[socketId]){
                if(this.socketCallbacks[socketId][queryId]){
                    this.socketCallbacks[socketId][queryId](error,response)
                }
            }
        })
        socket.on('relay:internal:error',err =>{
            console.error(err)
        })
        if(this.receiversSockets[relayId]){
            if(this.receiversSockets[relayId].connected){
                this.receiversSockets[relayId].disconnect(true)//TODO verify this is the correct way to go
            }
            delete this.receiversSockets[relayId]
        }
        this.receiversSockets[relayId] = socket
    }

    sendHttpRequest(req:httpRequestInfo, cb:(err:RelayErrorMessage|null,res:RelayMessageHttpResponse|null)=>void) {
        const {relayId,requestId,body,headers,method,url} = req
        if(!this.httpCallbacks[relayId]){
            this.httpCallbacks[relayId] = {}
        }
        
        if(!this.receiversSockets[relayId] /*|| !this.receiversSockets[relayId].connected*/){
            cb({
                type:'error',
                message:''
            }, null)
            return
        }

        const httpReqMessage:RelayMessageHttpRequest = {
            type:'httpRequest',
            relayId,
            requestId,
            body,
            headers,
            method,
            url,
        } 
        this.receiversSockets[relayId].emit('relay:internal:httpRequest',httpReqMessage)
        this.httpCallbacks[relayId][requestId] = cb
    }
}