import {VaasServerType} from 'vaas-framework'
import * as path from 'path'
import {
    promises as fsPromises, constants as fsConstants, 
    readdirSync, statSync
} from 'fs'
import {
    Worker
} from 'worker_threads';
import {S3} from '../lib/s3'


import config from './index'
import {Etcd} from '../lib/etcd'


export const etcd = new Etcd({...config.configServer.etcd})
export const s3 = new S3({
    ...config.storageServer.minio
})



const SYS_APP_LIST = ['platform']
const AppsDir = path.dirname(path.dirname(
    __dirname
))

function upgradeConfigKey({key=''}) {
    return key.substring(0,key.length-1)+String.fromCodePoint(key.codePointAt(key.length-1)+1)
}

function getAppConfigKeyByAppName({appName=''}) {
    return `/vaas/config/app/${appName}`
}

function getHostKeyByHost({host=''}) {
    return `/vaas/config/host/${host}`
}

function getDeployKeyByAppName({appName='', version}) {
    return `/vaas/config/deploy/${appName}/${version}`
}

export async function setDeployKeyByAppName({appName, version, appBuildS3Key}) {
    const res = await etcd.put({
        key:getDeployKeyByAppName({appName, version}),
        value:{appBuildS3Key, appName, version}
    })
    return res
}

export async function getDeployDataByAppName({appName, version}) {
    const deployData = (await etcd.range({
        key:getDeployKeyByAppName({appName, version}),
        isCache:true
    }))[0]
    return deployData
}

export function getDeployAppPath({appName, version}) {
    return path.join(AppsDir, appName, version)
}

export function getDeployMetaPath({appName}) {
    return path.join(AppsDir, `${appName}.deploy.json`)
}

async function isExistDeployMeta({deployMetaPath}) {
    let isExist = true
    try {
        await fsPromises.access(deployMetaPath, fsConstants.F_OK)
    } catch(error) {
        isExist = false
    }
    return isExist
}

async function getDeployMetaJson({deployMetaPath}):Promise<{
    key:string,
    value:{
        appBuildS3Key:string, appName:string, version:string
    }
}> {
    return JSON.parse(await (await fsPromises.readFile(deployMetaPath)).toString())
}

function deployApp({appName, version, appBuildS3Key, deployData}) {
    return new Promise((resolve, reject)=>{
        const deployAppWorkerPath = path.join(
            path.dirname(__dirname),
            '/deploy/deployAppWorker.js'
        )
        const worker = new Worker(deployAppWorkerPath,{
            workerData:{appName, version, appBuildS3Key, deployData}
        });
        worker.once("error",(error)=>{
            worker.removeAllListeners()
            return reject(error)
        })
        worker.once("exit",(exitCode)=>{
            worker.removeAllListeners()
            return resolve(exitCode)
        })
    })
    
}


export async function latestApp({appName}) {
    const latestDeployData =  await getDeployDataByAppName({appName, version:'latest'})
    const appBuildS3Key = latestDeployData?.value?.appBuildS3Key || ''
    if(!appBuildS3Key) {
        throw new Error(`appName[${appName}] not be deployed!please run [vaas deploy] in your vaas project!`)
    }
    const version = latestDeployData?.value?.version || ''
    const deployMetaPath = getDeployMetaPath({appName})
    const isExist = await isExistDeployMeta({deployMetaPath})
    if(!isExist) {
        return await deployApp({appName, version, appBuildS3Key, deployData: latestDeployData})
    }
    const nowDeployData = await getDeployMetaJson({deployMetaPath})
    if(nowDeployData.value.appBuildS3Key!=latestDeployData.value.appBuildS3Key){
        return await deployApp({appName, version, appBuildS3Key, deployData: latestDeployData})
    }
    return true
}


export async function getAllAppConfigList() {
    return await etcd.range({
        key:getAppConfigKeyByAppName({}),
        rangeEnd:upgradeConfigKey({key:getAppConfigKeyByAppName({})})
    })
}

export async function getAllHostConfigList() {
    return await etcd.range({
        key:getHostKeyByHost({}),
        rangeEnd:upgradeConfigKey({key:getHostKeyByHost({})})
    })
}

export async function getAppConfigDataByName({appName,isCache=false}) {
    const appConfigList = await etcd.range({key:getAppConfigKeyByAppName({appName}), isCache})
    return appConfigList[0]
}

export async function isAppNameRegistered({appName}) {
    return Boolean(await getAppConfigDataByName({appName}))
}

export async function IsHostRegistered({host,appName}) {
    const hostConfigList = await etcd.range({key:getHostKeyByHost({host})})
    const otherHostConfigList = hostConfigList.filter(e=>e.value.appName!==appName)
    return Boolean(otherHostConfigList?.length)
}

export async function setHostConfig({
    host,
    appName
}) {
    return await etcd.put({key:getHostKeyByHost({host}),value:{appName,host}})
}

export async function deleteHostConfigByHost({
    host,
}) {
    return await etcd.delete({key:getHostKeyByHost({host})})
}


export async function setAppConfigByAppName({
    appName, 
    description,
    appConfig
}:{
    appName:string,
    description:string,
    appConfig:VaasServerType.AppConfig
}):Promise<any> {
    if(SYS_APP_LIST.includes(appName)) {
        throw new Error(`The system app cannot be modified`)
    }
    return await etcd.put({key:getAppConfigKeyByAppName({appName}),value:{
        appName,
        description,
        appConfig
    }})
}

export async function deleteAppConfigByAppName({
    appName, 
}:{
    appName:string,
}) {
    return await etcd.delete({key:getAppConfigKeyByAppName({appName})})
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
    const hostConfigList = await etcd.range({key:getHostKeyByHost({host}),isCache:true})
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
    if(SYS_APP_LIST.includes(appName)) {
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
    await latestApp({appName})
    return appConfig
}

export async function getByPassFlowVersion(appName:string):Promise<string> {
    const deployMetaPath = getDeployMetaPath({appName})
    const isExist = await isExistDeployMeta({deployMetaPath})
    if(!isExist) {
        return ''
    }
    const nowDeployData = await getDeployMetaJson({deployMetaPath})
    return nowDeployData?.value?.version || ''
}