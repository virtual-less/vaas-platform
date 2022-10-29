import {Netcd, Metadata} from 'netcd'


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
        rangeEnd
    }:{
        key:string,
        rangeEnd?:string,
    }):Promise<Array<any>> {
        const client = this.netcd.getClient('KV')
        const meta = await this.getMeta()
        return await new Promise((reslove, reject)=>{
            client.Range({
                key:Buffer.from(key).toString('base64'),
                rangeEnd:rangeEnd?Buffer.from('\0').toString('base64'):undefined,
            },meta, (err,data)=>{
                if(err)return reject(err)
                return reslove((data.kvs || []).map(data=>{
                    data.key = data.key.toString()
                    data.value = JSON.parse(data.value)
                    return data
                }))
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