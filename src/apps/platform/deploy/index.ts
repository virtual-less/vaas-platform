import { 
    isAppNameRegistered, setDeployKeyByAppName,
    getByPassDataByAppName, setByPassByAppName
} from '../config/dynamicConfig'


export async function deploy({appName, version, appBuildS3Key}) {
    if(!(await isAppNameRegistered({appName}))) {
        throw new Error(`appName[${appName}] not Registered!`)
    }
    const deployVersionRes =  await setDeployKeyByAppName({appName, version, appBuildS3Key})
    const byPassData  = await getByPassDataByAppName({appName})
    let byPassDataValue = byPassData?.value
    if(!byPassDataValue) {
        byPassDataValue = {
            type:'latest',
            latest:{version}
            
        }
    } else {
        byPassDataValue.latest = {version}
    }
    const byPassDataEffectRes = await setByPassByAppName({
        appName, 
        strategy:byPassDataValue
    })
    return {
        deployVersionRes,
        byPassDataEffectRes
    }
}

