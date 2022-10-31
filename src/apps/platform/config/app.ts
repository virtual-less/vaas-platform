import {VaasServerType} from 'vaas-framework'
import * as compressing from 'compressing'
import * as path from 'path'
import {promises as fsPromises, constants as fsConstants} from 'fs'
import {v1 as uuidV1} from 'uuid'
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

function getDeployKeyByAppName({appName=''}) {
    return `/vaas/config/deploy/${appName}`
}

export async function setDeployKeyByAppName({appName,appBuildTgzS3Key}) {
    const res = await etcd.put({
        key:getDeployKeyByAppName({appName}),
        value:{appBuildTgzS3Key, appName}
    })
    return res
}

export async function getDeployDataByAppName({appName}) {
    const deployData = (await etcd.range({
        key:getDeployKeyByAppName({appName}),
    }))[0]
    return deployData
}

function getDeployMetaPath({appName}) {
    return path.join(AppsDir,`${appName}.deploy`)
}

async function deployApp({appName, deployData}) {
    const filePath = path.join(
        __dirname, uuidV1()
    )
    await s3.fGetObject({
        key:deployData.value.appBuildTgzS3Key,
        filePath
    })
    await compressing.tgz.uncompress(filePath, AppsDir)
    await fsPromises.unlink(filePath)
    return await fsPromises.writeFile(getDeployMetaPath({appName}),JSON.stringify(deployData))
}


export async function latestApp({appName}) {
    const latestDeployData =  await getDeployDataByAppName({appName})
    let isExist = true
    try {
        await fsPromises.access(getDeployMetaPath({appName}), fsConstants.F_OK)
    } catch(error) {
        isExist = false
    }
    if(!isExist) {
        return await deployApp({appName,deployData:latestDeployData})
    }
    const nowDeployData = JSON.parse(await (await fsPromises.readFile(getDeployMetaPath({appName}))).toString())
    if(nowDeployData.value.appBuildTgzS3Key!=latestDeployData.value.appBuildTgzS3Key){
        return await deployApp({appName,deployData:latestDeployData})
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

export async function getAppConfigDataByName({appName}) {
    const appConfigList = await etcd.range({key:getAppConfigKeyByAppName({appName})})
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



export async function getAppNameByRequest(request:VaasServerType.RequestConfig):Promise<string> {
    const hostConfigList = await etcd.range({key:getHostKeyByHost({host:request.hostname})})
    if(hostConfigList) {
        for(const hostConfig of hostConfigList) {
            return hostConfig.value.appName
        }
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
    const appConfigData = await getAppConfigDataByName({appName})
    if(!appConfigData) {
        throw new Error(`appName[${appName}] not be registered`)
    }
    await latestApp({appName})
    return appConfigData.value
}