import * as path from 'path'
import {
    promises as fsPromises, constants as fsConstants, 
} from 'fs'
import {
    Worker
} from 'worker_threads';
import {
    getDeployDataByAppName, 
} from './dynamicConfig'

const AppsDir = path.dirname(path.dirname(
    __dirname
))

export function getDeployAppPath({appName, version}) {
    return path.join(AppsDir, appName, version)
}

export function getDeployMetaPath({appName, version}) {
    return path.join(AppsDir, appName, version, `vaas.deploy.json`)
}

async function isExistFilePath({filePath}) {
    let isExist = true
    try {
        await fsPromises.access(filePath, fsConstants.F_OK)
    } catch(error) {
        isExist = false
    }
    return isExist
}

async function getMetaJson({metaPath}):Promise<{
    key:string,
    value:{
        appBuildS3Key:string, appName:string, version:string
    }
}> {
    return JSON.parse(await (await fsPromises.readFile(metaPath)).toString())
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


export async function deployVersionApp({appName, version}) {
    const versionDeployData =  await getDeployDataByAppName({appName, version})
    const appBuildS3Key = versionDeployData?.value?.appBuildS3Key || ''
    if(!appBuildS3Key) {
        throw new Error(`appName[${appName}] not be deployed!please run [vaas deploy] in your vaas project!`)
    }
    const deployMetaPath = getDeployMetaPath({appName, version})
    const isExist = await isExistFilePath({filePath:deployMetaPath})
    if(!isExist) {
        return await deployApp({appName, version, appBuildS3Key, deployData: versionDeployData})
    }
    const nowDeployData = await getMetaJson({metaPath:deployMetaPath})
    if(nowDeployData.value.appBuildS3Key!=versionDeployData.value.appBuildS3Key){
        return await deployApp({appName, version, appBuildS3Key, deployData: versionDeployData})
    }
    return true
}