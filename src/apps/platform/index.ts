import {VaasServerType, Decorator} from 'vaas-framework'
import {v1 as uuidV1} from 'uuid'
import {
    getAllAppConfigList, isAppNameRegistered, setAppConfigByAppName, 
    getAppConfigDataByName,deleteAppConfigByAppName,
    getAllHostConfigList, setHostConfig, deleteHostConfigByHost,
    getByPassDataByAppName, setByPassByAppName, getAllVsersionByAppName,
    IsHostRegistered
} from './config/dynamicConfig'

import {
    s3
} from './config/app'

import {deploy} from './deploy/index'
import * as moment from 'moment'
import {promises as fsPromises} from 'fs'
import * as path from 'path'

export default class Platform {
    @Decorator.VaasServer({type:'http',method:'get','routerName':'/'})
    async index({req,res}:VaasServerType.HttpParams) {
        return (await fsPromises.readFile(path.join(__dirname,'public/index.html'))).toString()
    }
    @Decorator.VaasServer({type:'http',method:'get','routerName':'/:name*.:type'})
    async public({req,res}:VaasServerType.HttpParams) {
        const extname = path.extname(req.path)
        if(['.json','.js','.css','.txt','.map'].includes(extname)) {
            res.type = extname.replace(/^\./,'')
            return (await fsPromises.readFile(path.join(__dirname,'public',req.path))).toString()
        } else {
            return await fsPromises.readFile(path.join(__dirname,'public',req.path))
        }
        
    }

    @Decorator.VaasServer({type:'http',method:'get'})
    async getUploadUrl({req,res}:VaasServerType.HttpParams) {
        const {
            fileName,
        } = req.query
        const key = `vaas/upload/${
            moment().year()
        }/${
            moment().month()+1
        }/${
            moment().date()
        }/${uuidV1()}/${fileName}`
        const expirySeconds = 3600
        const uploadUrl = await s3.presignedPutObject({
            key,
            expiry:expirySeconds
        })
        return {
            data:{
                uploadUrl,
                key,
                expiry:expirySeconds
            }
        }
    }

    @Decorator.VaasServer({type:'http',method:'post'})
    async deploy({req,res}:VaasServerType.HttpParams) {
        const {
            appBuildS3Key,
            appName,
            version
        } = req.body
        const data = await deploy({appName, version, appBuildS3Key})
        return {data}
    }

    @Decorator.VaasServer({type:'http',method:'get'})
    async getAllAppList({req,res}:VaasServerType.HttpParams) {
        const configData =  await getAllAppConfigList()
        return {data:configData.map(e=>e.value)}
    }

    @Decorator.VaasServer({type:'http',method:'get'})
    async getAllHostList({req,res}:VaasServerType.HttpParams) {
        const configData =  await getAllHostConfigList()
        return {data:configData.map(e=>e.value)}
    }

    @Decorator.VaasServer({type:'http',method:'get'})
    async getAppByName({req,res}:VaasServerType.HttpParams) {
        const {
            appName,
        } = req.query
        const appConfigData =  await getAppConfigDataByName({appName})
        return {data:appConfigData.value}
    }
    
    @Decorator.VaasServer({type:'http',method:'post'})
    async createHostConfig({req,res}:VaasServerType.HttpParams) {
        const {
            appName,
            host
        } = req.body
        if(await IsHostRegistered({host, appName})) {
            throw new Error(`host[${host}] is Registered!`)
        }
        const data = await setHostConfig({
            appName,
            host
        })
        return data;
    }

    @Decorator.VaasServer({type:'http',method:'put'})
    async updateHostConfig({req,res}:VaasServerType.HttpParams) {
        const {
            appName,
            host
        } = req.body
        const data = await setHostConfig({
            appName,
            host
        })
        return data;
    }

    @Decorator.VaasServer({type:'http',method:'delete', routerName:"/deleteHostConfig/:host"})
    async deleteHostConfig({req,res}:VaasServerType.HttpParams) {
        let {
            host
        } = req.params
        if(host instanceof Array) {host = host[0]}
        const data =  await deleteHostConfigByHost({host})
        return {data}
    }

    @Decorator.VaasServer({type:'http',method:'post'})
    async createAppConfig({req,res}:VaasServerType.HttpParams) {
        const {
            appName,
            description,
            maxWorkerNum,
            allowModuleSet,
            timeout,
            resourceLimits,
        } = req.body
        if(await isAppNameRegistered({appName})) {
            throw new Error(`appName[${appName}] is Registered!`)
        }
        const data = await setAppConfigByAppName({
            appName,
            description,
            appConfig:{
                maxWorkerNum,
                allowModuleSet,
                timeout,
                resourceLimits
            }
        })
        return {data}
    }

    @Decorator.VaasServer({type:'http',method:'put'})
    async updateAppConfig({req,res}:VaasServerType.HttpParams) {
        const {
            appName,
            description,
            maxWorkerNum,
            allowModuleSet,
            timeout,
            resourceLimits,
        } = req.body
        const data = await setAppConfigByAppName({
            appName,
            description,
            appConfig:{
                maxWorkerNum,
                allowModuleSet,
                timeout,
                resourceLimits
            }
        })
        return {data}
    }

    @Decorator.VaasServer({type:'http',method:'delete', routerName:"/deleteAppConfig/:appName"})
    async deleteAppConfig({req,res}:VaasServerType.HttpParams) {
        let {
            appName
        } = req.params
        if(appName instanceof Array) {appName = appName[0]}
        const data =  await deleteAppConfigByAppName({appName})
        return {data}
    }

    @Decorator.VaasServer({type:'http',method:'get'})
    async getByPassDataByAppName({req,res}:VaasServerType.HttpParams) {
        const {
            appName,
        } = req.query
        const byPassData =  await getByPassDataByAppName({appName})
        return {data:byPassData?.value}
    }

    @Decorator.VaasServer({type:'http',method:'put'})
    async updateByPassConfig({req,res}:VaasServerType.HttpParams) {
        const {
            appName,
            strategy,
        } = req.body
        const data = await setByPassByAppName({
            appName,
            strategy
        })
        return {data}
    }

    @Decorator.VaasServer({type:'http',method:'get'})
    async getAllVsersionByAppName({req,res}:VaasServerType.HttpParams) {
        const {
            appName,
            limit=50
        } = req.query
        const versionList = (await getAllVsersionByAppName({appName, limit})).map((e)=>e.value.version)
        return {
            data:versionList
        }
    }

}