import * as path from 'path'
import {v1 as uuidV1} from 'uuid'
import { s3 } from '../config/app'
import { getDeployAppPath, getDeployMetaPath } from '../config/deploy'
import * as compressing from 'compressing'
import {
    promises as fsPromises
} from 'fs'
import {
    workerData
} from 'worker_threads';

async function deployApp({appName, version, appBuildS3Key, deployData}) {
    const filePath = path.join(
        __dirname, uuidV1()
    )
    await s3.fGetObject({
        key:appBuildS3Key,
        filePath
    })
    const appDirPath = getDeployAppPath({appName, version})
    await compressing.zip.uncompress(filePath, appDirPath)
    await fsPromises.unlink(filePath)
    return await fsPromises.writeFile(getDeployMetaPath({appName, version}),JSON.stringify(deployData))
}
deployApp(workerData)