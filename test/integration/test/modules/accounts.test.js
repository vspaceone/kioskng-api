// TODO From this: https://medium.com/assertqualityassurance/aws-lambda-integration-test-easier-than-you-might-think-a66a9d600916
const { 
    LambdaClient,
    InvokeCommand
} = require('@aws-sdk/client-lambda')
const { fromUtf8, toUtf8 } = require("@aws-sdk/util-utf8-node");
const { testAndExtractLambdaResponse, httpPayload, isUuid } = require("../../helper");
const { assert } = require('chai')

describe("Account Service", function() {

    this.timeout(10000);

    let lambdaClient = new LambdaClient({
        endpoint: 'http://127.0.0.1:3001',
        region: 'eu-north-1',
        tls: false
    })

    let accountIdCreated;

    describe("GET", () => {
        let anyAccountId;

        it('without parameters returns 200 with JSON array', async function() {
            const command = new InvokeCommand({
                FunctionName: "AccountService",
                InvocationType: "RequestResponse",
                Payload: httpPayload({
                    method: "GET"
                })
            });

            const response = await lambdaClient.send(command);
            const {statusCode, body} = testAndExtractLambdaResponse(response);
            
            assert(statusCode === 200, "Payload status code is 200");
            assert(Array.isArray(body), "Returned data is an array");

            anyAccountId = body[0].id;
        });
    
        it('with path parameter id returns 200 with JSON object with matching id', async function() {
            const command = new InvokeCommand({
                FunctionName: "AccountService",
                InvocationType: "RequestResponse",
                Payload: httpPayload({
                    method: "GET",
                    pathParameters: {
                        "id": anyAccountId
                    }
                })
            });

            const response = await lambdaClient.send(command);
            const {statusCode, body} = testAndExtractLambdaResponse(response);
            
            assert(statusCode === 200, "Payload status code is 200");
            assert(!Array.isArray(body), "Returned data is not an array")
            assert(body.id, "Returned object id equals requested one.")
        });

        it('with path parameter id returns 404 without body when id does not exist', async function() {
            const command = new InvokeCommand({
                FunctionName: "AccountService",
                InvocationType: "RequestResponse",
                Payload: httpPayload({
                    method: "GET",
                    pathParameters: {
                        "id": "00000000-0000-0000-0000-000000000000"
                    }
                })
            });

            const response = await lambdaClient.send(command);
            const {payload, statusCode} = testAndExtractLambdaResponse(response);
            
            assert(statusCode === 404, "Payload status code is 404");
            assert(!payload.body, "No body is returned")
        });
    });

    describe('PUT', function(){
        it('with id field is rejected (payload does not match schema)', async function() {
            const command = new InvokeCommand({
                FunctionName: "AccountService",
                InvocationType: "RequestResponse",
                Payload: httpPayload({
                    method: "PUT",
                    body: {
                        "id": "00000000-0000-0000-0000-000000000000",
                        "fullname": "Hans Vader",
                        "street": "Galactic Road 000",
                        "post_code": "00000",
                        "city": 'Milky Highway',
                        "pin": '0000'
                    }
                })
            });

            const response = await lambdaClient.send(command);
            let temp = toUtf8(response.Payload)
            const {payload, statusCode} = testAndExtractLambdaResponse(response);
            
            assert(statusCode === 422, "Payload status code is 422");
        });

        it('is accepted and returns full payload with id', async function() {
            const command = new InvokeCommand({
                FunctionName: "AccountService",
                InvocationType: "RequestResponse",
                Payload: httpPayload({
                    method: "PUT",
                    body: {
                        "fullname": "Hans Vader",
                        "street": "Galactic Road 000",
                        "post_code": "00000",
                        "city": 'Milky Highway',
                        "pin": '0000'
                    }
                })
            });

            const response = await lambdaClient.send(command);
            let temp = toUtf8(response.Payload)
            const {payload, statusCode, body} = testAndExtractLambdaResponse(response);
            
            assert(statusCode === 200, "Payload status code is 200");
            assert(isUuid(body.id) , "Payload id is valid UUID");
            accountIdCreated = body.id;
            assert(body.fullname === "Hans Vader", "Payload fullname equals put value");
            assert(body.street === "Galactic Road 000", "Payload street equals put value");
            assert(body.post_code === "00000", "Payload post_code equals put value");            
            assert(body.city === 'Milky Highway', "Payload city equals put value");
            assert(body.pin === '0000', "Payload pin equals put value");
        });
    });

    describe('POST', function(){
        it('with id field is rejected (payload does not match schema)', async function() {
            const command = new InvokeCommand({
                FunctionName: "AccountService",
                InvocationType: "RequestResponse",
                Payload: httpPayload({
                    method: "POST",
                    pathParameters: {
                        id: accountIdCreated
                    },
                    body: {
                        "id": accountIdCreated,
                        "fullname": "Hans Vader",
                        "street": "Galactic Road 000",
                        "post_code": "00000",
                        "city": 'Milky Highway',
                        "pin": '0000'
                    }
                })
            });

            const response = await lambdaClient.send(command);
            let temp = toUtf8(response.Payload)
            const {payload, statusCode} = testAndExtractLambdaResponse(response);
            
            assert(statusCode === 422, "Payload status code is 422");
        });

        it('with non existend id returns 404', async function() {
            const command = new InvokeCommand({
                FunctionName: "AccountService",
                InvocationType: "RequestResponse",
                Payload: httpPayload({
                    method: "POST",
                    pathParameters: {
                        id: "00000000-0000-0000-0000-000000000000"
                    },
                    body: {
                        "fullname": "Hans Bader",
                        "street": "Galactic Boulevard 000",
                        "post_code": "00001",
                        "city": 'Milky Street',
                        "pin": '0001'
                    }
                })
            });

            const response = await lambdaClient.send(command);
            let temp = toUtf8(response.Payload)
            const {payload, statusCode, body} = testAndExtractLambdaResponse(response);
            
            assert(statusCode === 404, "Payload status code is 404");
        });

        it('is accepted and returns full changed payload with id', async function() {
            const command = new InvokeCommand({
                FunctionName: "AccountService",
                InvocationType: "RequestResponse",
                Payload: httpPayload({
                    method: "POST",
                    pathParameters: {
                        id: accountIdCreated
                    },
                    body: {
                        "fullname": "Hans Bader",
                        "street": "Galactic Boulevard 000",
                        "post_code": "00001",
                        "city": 'Milky Street',
                        "pin": '0001'
                    }
                })
            });

            const response = await lambdaClient.send(command);
            let temp = toUtf8(response.Payload)
            const {payload, statusCode, body} = testAndExtractLambdaResponse(response);
            
            assert(statusCode === 200, "Payload status code is 200");
            assert(isUuid(body.id) , "Payload id is valid UUID");
            assert(body.fullname === "Hans Bader", "Payload fullname equals put value");
            assert(body.street === "Galactic Boulevard 000", "Payload street equals put value");
            assert(body.post_code === "00001", "Payload post_code equals put value");            
            assert(body.city === 'Milky Street', "Payload city equals put value");
            assert(body.pin === '0001', "Payload pin equals put value");
        });
    });

    describe('DELETE', function(){
        it('is accepted and returns no content', async function() {
            const command = new InvokeCommand({
                FunctionName: "AccountService",
                InvocationType: "RequestResponse",
                Payload: httpPayload({
                    method: "DELETE",
                    pathParameters: {
                        id: accountIdCreated
                    }
                })
            });

            const response = await lambdaClient.send(command);
            let temp = toUtf8(response.Payload)
            const {payload, statusCode, body} = testAndExtractLambdaResponse(response);
            
            assert(statusCode === 201, "Payload status code is 201");
        });

        it('is accepted and returns no content for non existend IDs', async function() {
            const command = new InvokeCommand({
                FunctionName: "AccountService",
                InvocationType: "RequestResponse",
                Payload: httpPayload({
                    method: "DELETE",
                    pathParameters: {
                        id: "00000000-0000-0000-0000-000000000000"
                    }
                })
            });

            const response = await lambdaClient.send(command);
            let temp = toUtf8(response.Payload)
            const {payload, statusCode, body} = testAndExtractLambdaResponse(response);
            
            assert(statusCode === 201, "Payload status code is 201");
        });
    });
  
})