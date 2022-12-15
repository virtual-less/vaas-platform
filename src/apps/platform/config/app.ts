import {VaasServerType} from 'vaas-framework'
import * as path from 'path'
import {
    readdirSync, statSync
} from 'fs'
import {S3} from '../lib/s3'
import config from './index'
import {
    getAppConfigDataByName, 
    getByPassDataByAppName,
    getHostConfigByHost,
    isSysAppByAppName
} from './dynamicConfig'
import {
    deployVersionApp
} from './deploy'

export const s3 = new S3({
    ...config.storageServer.minio
})

function getVersionByByPassData(byPassDataValue) {
    // lock 为锁定版本, weight 为版本权重，latest为使用最新发布【默认选项】
    switch(byPassDataValue.type) {
        case 'lock':
            return byPassDataValue.lock.version;
        case 'weight':
            const weightList:Array<{version:string,weight:number}> = byPassDataValue.weight
            const total = weightList.reduce((total,now)=>total+now.weight,0)
            const random = Math.ceil(Math.random()*total)
            let weightTotal = 0
            for (const item of weightList) {
                if(weightTotal<=random && random<= weightTotal+item.weight) {
                    return item.version
                }
                weightTotal+=item.weight
            }
        case 'latest':
            return byPassDataValue.latest.version;
        default:
            throw new Error(`strategy type [${byPassDataValue.type}] not exist!`)
    }
}

const PlatformPublicPath = path.join(path.dirname(__dirname),'public')

function getDirFilePathList(filePathList:Array<string>, dirPath:string) {
    const fileNameList = readdirSync(dirPath)
    for(const fileName of fileNameList) {
        if(fileName=='.' || fileName=='..'){continue}
        const filePath = path.join(dirPath, fileName)
        const stat = statSync(filePath)
        if(stat.isDirectory()) {
            getDirFilePathList(filePathList,filePath)
        }
        filePathList.push(filePath)
    }
    return filePathList;
}

let PlatformPublicFilePathSet = null
export async function getAppNameByRequest(request:VaasServerType.RequestConfig):Promise<string> {
    const host = request.hostname
    // 配置优先
    const hostConfigList = await getHostConfigByHost({host, isCache:true})
    if(hostConfigList) {
        for(const hostConfig of hostConfigList) {
            return hostConfig.value.appName
        }
    }
    // 否则默认渲染platform
    const publicPath = path.join(PlatformPublicPath, request.path)
    if(!PlatformPublicFilePathSet) {
        PlatformPublicFilePathSet = new Set<string>(getDirFilePathList([], PlatformPublicPath))
    }
    let isExist = PlatformPublicFilePathSet.has(publicPath)
    if(isExist || request.path==='/') {
        return 'platform'
    }
    return ''
}

export async function getAppConfigByAppName(appName:string):Promise<VaasServerType.AppConfig> {
    if(isSysAppByAppName({appName})) {
        return {
            maxWorkerNum: 2,
            allowModuleSet: new Set(['*']),
            timeout: 30*1000
        }
    }
    const appConfigData = await getAppConfigDataByName({appName, isCache:true})
    const appConfig = appConfigData.value.appConfig;
    appConfig.allowModuleSet = new Set(appConfig.allowModuleSet);
    if(!appConfigData) {
        throw new Error(`appName[${appName}] not be registered`)
    }
    return appConfig
}

export async function getByPassFlowVersion(appName:string):Promise<string> {
    let version = ''
    if(isSysAppByAppName({appName})) {
        return version
    }
    const byPassData = await getByPassDataByAppName({appName})
    if(!byPassData) {
        throw new Error(`appName[${appName}] not be deployed`)
    }
    version = getVersionByByPassData(byPassData.value)
    await deployVersionApp({appName, version})
    return version
}