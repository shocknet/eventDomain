import jwt from 'jsonwebtoken'
import {v1 as uuidv1} from 'uuid'
import Storage from 'node-persist'
import { TokenData } from './types'


Storage.init({
dir: '.storage'
})

export default class Auth {
    readSecrets = async () => {
        const secrets = await Storage.getItem('auth/secrets')

        if (secrets) {
            return secrets
        }

        const newSecrets = await Storage.setItem('auth/secrets', {})

        return newSecrets
    }

    async writeSecrets(key:number, value:string) {
        const allSecrets = await this.readSecrets()
        const newSecrets = await Storage.setItem('auth/secrets', {
            ...allSecrets,
            [key]: value
        })
        return newSecrets
    }

    async generateToken(relayId:string) {
        if(!relayId){
            throw new Error('no relayId provided to generate token')
        }
        const timestamp = Date.now()
        const secret = uuidv1()
        //logger.info('Generating new secret...')
        const token = jwt.sign(
            {
                data: { 
                    timestamp,
                    relayId
                }
            },
            secret,
            { expiresIn: '1000000h' }
        )
        //logger.info('Saving secret...')
        await this.writeSecrets(timestamp, secret)
        return token
    }

    async validateToken(token:string,relayId:string) {
        if(!relayId){
            throw new Error('no relayId provided to validate token')
        }
        const {data:jwtData} = jwt.decode(token) as TokenData
        const key = jwtData.timestamp
        const tokenRelayId = jwtData.relayId
        if(relayId !== tokenRelayId){
            throw new Error('unauthorized relayId')
        }
        const secrets = await this.readSecrets()
        const secret = secrets[key]
        if (!secret) {
            throw Error('invalid token provided')
        }
        await new Promise((resolve, reject) => {
            jwt.verify(token, secret, (err:Error|null, decoded:any) => {
            if (err) {
                //logger.info('validateToken err', err)
                reject('invalid token provided')
            } else {
                // logger.info('decoded', decoded)
                resolve(null)
            }
            })
        })
        return true
        
    }
}

