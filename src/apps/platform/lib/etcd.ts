import {Netcd} from 'netcd'


export class Etcd {
    netcd:Netcd;
    constructor({endpoints}) {
        this.netcd = new Netcd({endpoints})
    }

    range({
        key,
        range_end
    }:{
        key:string,
        range_end?:string,
    }):Promise<Array<any>> {
        const client = this.netcd.getClient('KV')
        return new Promise((reslove, reject)=>{
            client.Range({
                key:Buffer.from(key).toString('base64'),
                range_end:range_end?Buffer.from(range_end).toString('base64'):undefined,
            },(err,data)=>{
                if(err)return reject(err)
                return reslove((data.kvs || []).map(data=>{
                    data.key = data.key.toString()
                    data.value = JSON.parse(data.value)
                    return data
                }))
            })
        })
    }

    put({
        key,
        value
    }:{
        key:string,
        value:NodeJS.Dict<any>,
    }) {
        const client = this.netcd.getClient('KV')
        return new Promise((reslove, reject)=>{
            client.Put({
                key:Buffer.from(key).toString('base64'),
                value:Buffer.from(JSON.stringify(value)).toString('base64'),
            },(err,data)=>{
                if(err)return reject(err)
                return reslove(data)
            })
        })
    }

    delete({
        key,
        range_end
    }:{
        key:string,
        range_end?:string,
    }) {
        const client = this.netcd.getClient('KV')
        return new Promise((reslove, reject)=>{
            client.DeleteRange({
                key:Buffer.from(key).toString('base64'),
                range_end:range_end?Buffer.from(range_end).toString('base64'):undefined,
            },(err,data)=>{
                if(err)return reject(err)
                return reslove(data)
            })
        })
    }
    
}