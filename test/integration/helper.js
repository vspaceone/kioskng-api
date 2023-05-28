const { exec } = require('child_process');
const request = require('sync-request');
const { assert } = require('chai')
const { fromUtf8, toUtf8 } = require("@aws-sdk/util-utf8-node");
const { 
    LambdaClient,
    InvokeCommand
} = require('@aws-sdk/client-lambda')

const NIL_UUID =  "00000000-0000-0000-0000-000000000000";

let lambdaClient = new LambdaClient({
    region: 'eu-north-1'
});

if (process.env.HANDLE_LOCAL_LAMBDA_RUN || process.env.LOCAL_LAMBDA_RUN){
    lambdaClient = new LambdaClient({
        endpoint: 'http://127.0.0.1:3001',
        region: 'eu-north-1',
        tls: false
    });
} 

function insaneSleepSeconds(seconds){
    var waitTill = new Date(new Date().getTime() + seconds * 1000);
    while(waitTill > new Date()){}
}

function startLambda() {
    exec(`sam local start-lambda &> /dev/null & disown`);
}

function waitForLambda(){
    let repeat = true;
    while (repeat && (process.env.HANDLE_LOCAL_LAMBDA_RUN || process.env.LOCAL_LAMBDA_RUN)) {
        console.log("Waiting for lambda server to be available...")
        try {
            let tempData = request('GET', 'http://127.0.0.1:3001/');
            if (tempData.statusCode === 404){
                console.log("Lambda endpoint returned an answer:")
                //console.log(tempData)
                repeat = false;
            }
        } catch (e) {}
        insaneSleepSeconds(1)
    }
}
  
async function stopLambda() {
    console.log("Killing lambda server...")
    await exec(`kill $(ps aux | grep '[s]am local start-lambda'  | awk '{print $2}')`);
    console.log("killed sam command")
    await exec(`docker stop $(docker ps | grep 'public.ecr.aws/lambda' | awk '{print $1}')`);
    console.log("killed containers")
    insaneSleepSeconds(5)
    await exec(`docker rm $(docker ps -a | grep 'public.ecr.aws/lambda' | awk '{print $1}')`);
    console.log("cleaned up containers")
    console.log("... Done")
    return 'Done';
}

function funcWithStage(functionName){
    return functionName + "-test";
}

function testAndExtractLambdaResponse(response){
    assert(response.StatusCode === 200, "Response metadata is 200");
    assert((typeof response.Payload) !== undefined, "Payload is provided");

    const payload = JSON.parse(toUtf8(response.Payload));

    let data = {payload: payload, respose: response};

    if (payload.statusCode){
        data.statusCode = payload.statusCode
    }

    if (payload.body){
        try {
            data.body = JSON.parse(payload.body)
        } catch (e){
            // Not a JSON
            data.body = payload.body
        }
    }

    return data;
}

function httpPayload(data){
    //fromUtf8(JSON.stringify())
    let payload = {
        "httpMethod": data.method,
    };

    if (data.body){
        payload.body = JSON.stringify(data.body);
    }

    if (data.pathParameters){
        payload.pathParameters = data.pathParameters;
    }

    if (data.queryStringParameters){
        payload.queryStringParameters = data.queryStringParameters;
    }

    return fromUtf8(JSON.stringify(payload));
}

function isUuid(uuid, isNullable = false) {
    return isNullable
        ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)
        : /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

async function invokeLambdaForResponse(funcName, payload){
    const command = new InvokeCommand({
        FunctionName: funcWithStage(funcName),
        InvocationType: "RequestResponse",
        Payload: payload
    });
    const response = await lambdaClient.send(command);
    return testAndExtractLambdaResponse(response);
}

exports.NIL_UUID = NIL_UUID;
exports.waitForLambda = waitForLambda;
exports.invokeLambdaForResponse = invokeLambdaForResponse;
exports.isUuid = isUuid;
exports.httpPayload = httpPayload;
exports.testAndExtractLambdaResponse = testAndExtractLambdaResponse;
exports.startLambda = startLambda;
exports.stopLambda = stopLambda;
exports.funcWithStage = funcWithStage;