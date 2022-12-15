import {Etcd} from '../lib/etcd'
import config from './index'
import {VaasServerType} from 'vaas-framework'


export const etcd = new Etcd({...config.configServer.etcd})

function upgradeConfigKey({key=''}) {
    return key.substring(0,key.length-1)+String.fromCodePoint(key.codePointAt(key.length-1)+1)
}

function getAppConfigKeyByAppName({appName=''}) {
    return `/vaas/config/app/${appName}`
}

function getHostKeyByHost({host=''}) {
    return `/vaas/config/host/${host}`
}

function getDeployKeyByAppName({appName, version=''}) {
    return `/vaas/config/deploy/${appName}/${version}`
}

function getByPassByAppName({appName=''}) {
    return `/vaas/config/bypass/${appName}`
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

export async function setByPassByAppName({appName, strategy}) {
    const res = await etcd.put({
        key:getByPassByAppName({appName}),
        value:strategy
    })
    return res
}

export async function getByPassDataByAppName({appName}) {
    const res = (await etcd.range({
        key:getByPassByAppName({appName}),
        isCache:true
    }))[0]
    return res
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
export async function getAllVsersionByAppName({appName, limit}) {
    return await etcd.range({
        key:getDeployKeyByAppName({appName}),
        rangeEnd:upgradeConfigKey({key:getDeployKeyByAppName({appName})}),
        limit
    })
}

export async function getHostConfigByHost({host, isCache=false}) {
    return await etcd.range({key:getHostKeyByHost({host}),isCache})
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

export function isSysAppByAppName({appName}) {
    return ['platform'].includes(appName);
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
    if(isSysAppByAppName({appName})) {
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