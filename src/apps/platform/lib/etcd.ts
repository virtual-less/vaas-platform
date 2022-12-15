import {Netcd, Metadata} from 'netcd'
import {CacheServer} from './cache'
import {createHash} from 'crypto'

// 虽然是全局生成，但是会被不同线程引用初始化多次
const cacheServer = new CacheServer()
export class Etcd {
    netcd:Netcd;
    private username:string;
    private password:string;
    constructor({endpoints, username, password}) {
        this.netcd = new Netcd({endpoints})
        this.username = username
        this.password = password
    }

    async authenticate({name,password}):Promise<any> {
        const client = this.netcd.getClient('Auth')
        return await new Promise((reslove, reject)=>{
            client.Authenticate({name, password},(err,data)=>{
                if(err)return reject(err)
                reslove(data)
            })
        })
    }

    async getMeta() {
        const meta = new Metadata()
        if(this.username && this.password) {
            // why to auth every time, because sampletoken mode can't be get exprie time
            // if you want more fast,you maybe need to close auth
            const authData = await this.authenticate({name:this.username,password:this.password})
            meta.add('Authorization', authData.token);
        }
        return meta
    }

    async range({
        key,
        rangeEnd,
        limit=0,
        sortOrder=2,
        sortTarget=2,
        isCache=false
    }:{
        key:string,
        rangeEnd?:string,
        limit?:number,
        sortOrder?:number,
        sortTarget?:number,
        isCache?:boolean
    }):Promise<Array<{key:string,value:any}>> {
        let cacheKey
        if(isCache) {
            cacheKey = createHash('sha256').update(JSON.stringify({
                key,
                rangeEnd
            })).digest('base64').toString()
            if(cacheServer.hasCache(cacheKey)) {
                return cacheServer.getCache(cacheKey)
            }
        }
        const client = this.netcd.getClient('KV')
        const meta = await this.getMeta()
        return await new Promise((reslove, reject)=>{
            client.Range({
                key:Buffer.from(key).toString('base64'),
                rangeEnd:rangeEnd?Buffer.from(rangeEnd).toString('base64'):undefined,
                limit,
                sortOrder,
                sortTarget
            },meta, (err,data)=>{
                if(err)return reject(err)
                const res = (data.kvs || []).map(data=>{
                    data.key = data.key.toString()
                    data.value = JSON.parse(data.value)
                    return data
                })
                if(isCache) {
                    cacheServer.setCache(cacheKey, res)
                }
                return reslove(res)
            })
        })
    }

    async put({
        key,
        value
    }:{
        key:string,
        value:NodeJS.Dict<any>,
    }) {
        const client = this.netcd.getClient('KV')
        const meta = await this.getMeta()
        return await new Promise((reslove, reject)=>{
            client.Put({
                key:Buffer.from(key).toString('base64'),
                value:Buffer.from(JSON.stringify(value)).toString('base64'),
            },meta,(err,data)=>{
                if(err)return reject(err)
                return reslove(data)
            })
        })
    }

    async delete({
        key,
        rangeEnd
    }:{
        key:string,
        rangeEnd?:string,
    }) {
        const client = this.netcd.getClient('KV')
        const meta = await this.getMeta()
        return await new Promise((reslove, reject)=>{
            client.DeleteRange({
                key:Buffer.from(key).toString('base64'),
                rangeEnd:rangeEnd?Buffer.from(rangeEnd).toString('base64'):undefined,
            },meta,(err,data)=>{
                if(err)return reject(err)
                return reslove(data)
            })
        })
    }
    
}