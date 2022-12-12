import { isAppNameRegistered, setDeployKeyByAppName } from '../config/app'


export async function deploy({appName, version, appBuildS3Key}) {
    if(!(await isAppNameRegistered({appName}))) {
        throw new Error(`appName[${appName}] not Registered!`)
    }
    return await setDeployKeyByAppName({appName, version, appBuildS3Key})
}

