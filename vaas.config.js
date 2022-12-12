const path = require("path");
const config = require("./build/apps/platform/config/app.js")
module.exports = {
    appsDir:path.join(__dirname,'build','apps'), 
    port:9080,
    showErrorStack:true,
    getAppNameByRequest: config.getAppNameByRequest,
    getAppConfigByAppName:config.getAppConfigByAppName,
    getByPassFlowVersion:config.getByPassFlowVersion
}