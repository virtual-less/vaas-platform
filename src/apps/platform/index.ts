import {VaasServerType, Decorator} from 'vaas-framework'
import {v1 as uuidV1} from 'uuid'
import {s3, getAllAppConfigList, isAppNameRegistered, setAppConfigByAppName} from './config/app'
import {deploy} from './deploy/index'
import * as moment from 'moment'

export default class Platform {
    @Decorator.VassServer({type:'http',method:'get'})
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

    @Decorator.VassServer({type:'http',method:'post'})
    async deploy({req,res}:VaasServerType.HttpParams) {
        const {
            appBuildTgzS3Key,
            appName
        } = req.body
        const data = await deploy({appName, appBuildTgzS3Key})
        return {data}
    }

    @Decorator.VassServer({type:'http',method:'get'})
    async getAllAppList({req,res}:VaasServerType.HttpParams) {
        const data =  await getAllAppConfigList()
        return {data}
    }
        

    @Decorator.VassServer({type:'http',method:'post'})
    async createAppConfig({req,res}:VaasServerType.HttpParams) {
        const {
            appName,
            description,
            hostList,
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
            appConfig:{
                appName,
                description,
                hostList,
                maxWorkerNum,
                allowModuleSet,
                timeout,
                resourceLimits
            }
        })
        return {data}
    }

    @Decorator.VassServer({type:'http',method:'put'})
    async updateAppConfig({req,res}:VaasServerType.HttpParams) {
        const {
            appName,
            description,
            hostList,
            maxWorkerNum,
            allowModuleSet,
            timeout,
            resourceLimits,
        } = req.body
        const data = await setAppConfigByAppName({
            appName,
            appConfig:{
                appName,
                description,
                hostList,
                maxWorkerNum,
                allowModuleSet,
                timeout,
                resourceLimits
            }
        })
        return {data}
    }

}