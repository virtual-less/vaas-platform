import { isAppNameRegistered, setDeployKeyByAppName } from '../config/app'


export async function deploy({appName, version, appBuildS3Key}) {
    if(!(await isAppNameRegistered({appName}))) {
        throw new Error(`appName[${appName}] not Registered!`)
    }
    const deployVersionRes =  await setDeployKeyByAppName({appName, version, appBuildS3Key})
    const deployLatestVersionRes =  await setDeployKeyByAppName({appName, version:'latest', appBuildS3Key})
    return {
        deployVersionRes,
        deployLatestVersionRes
    }
}

