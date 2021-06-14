import Storage from 'node-persist'
import SocketsHandler from './sockets'
import { StatusStoredObject } from './types'
export default class Handler {
    constructor(socketsHandler:SocketsHandler, intervalTime:number,maxEntries:number){
        this.sockets = socketsHandler
        this.intervalTime = intervalTime
        this.maxEntries = maxEntries
    }
    sockets:SocketsHandler
    intervalTime:number
    maxEntries:number
    latestCpu?:NodeJS.CpuUsage
    latestCpuTime?:number
    getConnectedClients(){
        const eDClients = Object.keys(this.sockets.receiversSockets).length
        const webClients = Object.keys(this.sockets.sendersSockets).length
        return {eDClients,webClients}
    }

    startHealthInterval(){
        setInterval(() => {
            this.updateStatus()
        },this.intervalTime)
    }

    async updateStatus(){
        const status = this.checkStatus()
        if(!status){
            return
        }
        let statusList =  await this.readStoredStatuses()
        if(statusList.length === this.maxEntries) {
            statusList.pop()
        }
        statusList.unshift(status)
        await Storage.setItem("track/status", statusList)
    }

    checkStatus(): StatusStoredObject|null{
        if(!this.latestCpu || !this.latestCpuTime){
            this.latestCpu = process.cpuUsage()
            this.latestCpuTime = Date.now()
            return null
        }
        const clientsNumbers = this.getConnectedClients()
        const newCpu = process.cpuUsage(this.latestCpu)
        const checkTime = Date.now()
        const percentCpu = 100 * (newCpu.user + newCpu.system) / ((checkTime - this.latestCpuTime) * 1000)
        const memoryBytes = process.memoryUsage().rss
        this.latestCpuTime = Date.now()
        this.latestCpu = process.cpuUsage()
        return {
            clientsNumbers,
            percentCpu,
            memoryBytes,
            checkTime
        }
    }
    
    async readStoredStatuses(): Promise<StatusStoredObject[]> {
        const item = await Storage.getItem("track/status") as StatusStoredObject[]
        if(!item){
            return []
        }
        return item
    }
}