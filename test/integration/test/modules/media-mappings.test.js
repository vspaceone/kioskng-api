// TODO From this: https://medium.com/assertqualityassurance/aws-lambda-integration-test-easier-than-you-might-think-a66a9d600916
const { fromUtf8, toUtf8 } = require("@aws-sdk/util-utf8-node");
const { invokeLambdaForResponse, testAndExtractLambdaResponse, httpPayload, isUuid, NIL_UUID } = require("../../helper");
const { expect } = require('chai')

describe("Media Mappings Service", function() {

    this.timeout(10000);

    let mediaIdCreated;

    describe("GET", () => {
        let anyMediaId;
        let anyMediaSpec = {};

        it('without parameters returns 200 with JSON array', async function() {
            const {statusCode, body} = await invokeLambdaForResponse(
                "MediaMappingService", 
                httpPayload({
                    method: "GET"
                })
            );
            
            expect(statusCode).to.equal(200);
            expect(body).to.be.an('array');

            anyMediaId = body[0].id;
            anyMediaSpec.media_identification = body[0].media_identification;
            anyMediaSpec.media_type = body[0].media_type;
        });
    
        it('with path parameter id returns 200 with JSON object with matching id', async function() {
            const {statusCode, body} = await invokeLambdaForResponse(
                "MediaMappingService", 
                httpPayload({
                    method: "GET",
                    pathParameters: {
                        "id": anyMediaId
                    }
                })
            );
            
            expect(statusCode).to.equal(200)
            expect(body).to.be.an('object');
            expect(body).to.have.a.property('id').that.equals(anyMediaId)
        });

        it('with existing url parameter combination of media_identification and media_type returns 200 with JSON object with matching values', async function() {
            const {statusCode, body} = await invokeLambdaForResponse(
                "MediaMappingService", 
                httpPayload({
                    method: "GET",
                    queryStringParameters: {
                        "media_type": anyMediaSpec.media_type,
                        "media_identification": anyMediaSpec.media_identification
                    }
                })
            );
            
            expect(statusCode).to.equal(200)
            expect(body).to.be.an('object');
            expect(isUuid(body.id)).to.be.true;
            expect(body).to.have.a.property('media_type').that.equals(anyMediaSpec.media_type)
            expect(body).to.have.a.property('media_identification').that.equals(anyMediaSpec.media_identification)
        });

        it('with non existing url parameter combination of media_identification and media_type returns 404', async function() {
            const {payload, statusCode, body} = await invokeLambdaForResponse(
                "MediaMappingService", 
                httpPayload({
                    method: "GET",
                    queryStringParameters: {
                        "media_type": anyMediaSpec.media_type,
                        "media_identification": "nothingthatexists"
                    }
                })
            );
            
            expect(statusCode).to.equal(404)
            expect(payload).to.not.have.a.property('body');
        });

        it('with path parameter id returns 404 without body when id does not exist', async function() {
            const {payload, statusCode} = await invokeLambdaForResponse(
                "MediaMappingService", 
                httpPayload({
                    method: "GET",
                    pathParameters: {
                        "id": NIL_UUID
                    }
                })
            );
            
            expect(statusCode).to.equal(404);
            expect(payload).to.not.have.a.property('body');
        });
    });

    describe('PUT', function(){
        it('with id field is rejected (payload does not match schema)', async function() {
            const {payload, statusCode} = await invokeLambdaForResponse(
                "MediaMappingService", 
                httpPayload({
                    method: "PUT",
                    body: {
                        "id": NIL_UUID,
                        "media_identification": "11234asdf34fqv",
                        "account": NIL_UUID,
                        "media_type": "RFID_ID",
                        "creation_timestamp": 012343544356,
                        "location": "APP",
                        "device_name": "Android ABC",
                        "valid_till_timestamp": 012343544356
                    }
                })
            );
            
            expect(statusCode).to.equal(422);
        });

        it('is accepted and returns full payload with id', async function() {
            const {payload, statusCode, body} = await invokeLambdaForResponse(
                "MediaMappingService", 
                httpPayload({
                    method: "PUT",
                    body: {
                        "media_identification": "11234asdf34fqv",
                        "account_id": NIL_UUID, // TODO account must exist in future implementations
                        "media_type": "RFID_ID",
                        "device_type": "App",
                        "device_name": "Android ABC"
                    }
                })
            );
            
            expect(statusCode).to.equal(200);
            expect(isUuid(body.id)).to.be.true;
            mediaIdCreated = body.id;
            expect(body).to.have.a.property('media_identification').that.equals('11234asdf34fqv')
            expect(body).to.have.a.property('account_id').that.equals(NIL_UUID)
            expect(body).to.have.a.property('media_type').that.equals('RFID_ID')
            expect(body).to.have.a.property('device_type').that.equals('App')
            expect(body).to.have.a.property('device_name').that.equals('Android ABC')
        });

        it('is accepted and returns full payload with id when media_identification exists for differen media_type', async function() {
            let {payload, statusCode, body} = await invokeLambdaForResponse(
                "MediaMappingService", 
                httpPayload({
                    method: "PUT",
                    body: {
                        "media_identification": "11234asdf34fqv",
                        "account_id": NIL_UUID, // TODO account must exist in future implementations
                        "media_type": "QR_CODE_EXACT_MATCH",
                        "device_type": "App",
                        "device_name": "Android ABC"
                    }
                })
            );
            
            expect(statusCode).to.equal(200);
            expect(isUuid(body.id)).to.be.true;
            expect(body).to.have.a.property('media_identification').that.equals('11234asdf34fqv')
            expect(body).to.have.a.property('account_id').that.equals(NIL_UUID)
            expect(body).to.have.a.property('media_type').that.equals('QR_CODE_EXACT_MATCH')
            expect(body).to.have.a.property('device_type').that.equals('App')
            expect(body).to.have.a.property('device_name').that.equals('Android ABC')

            // cleanup afterwards
            cleanupResponse = await invokeLambdaForResponse(
                "MediaMappingService", 
                httpPayload({
                    method: "DELETE",
                    pathParameters: {
                        id: body.id
                    }
                })
            );
            expect(cleanupResponse.statusCode).to.equal(204);
        });

        it('is rejected when media_identification and media_type combination already exists', async function() {
            const {payload, statusCode, body} = await invokeLambdaForResponse(
                "MediaMappingService", 
                httpPayload({
                    method: "PUT",
                    body: {
                        "media_identification": "11234asdf34fqv",
                        "account_id": NIL_UUID, // TODO account must exist in future implementations
                        "media_type": "RFID_ID",
                        "device_type": "App",
                        "device_name": "Android ABCD"
                    }
                })
            );
            
            expect(statusCode).to.equal(422);
        });
    });

    describe('DELETE', function(){
        it('is accepted and returns no content', async function() {
            const {payload, statusCode, body} = await invokeLambdaForResponse(
                "MediaMappingService", 
                httpPayload({
                    method: "DELETE",
                    pathParameters: {
                        id: mediaIdCreated
                    }
                })
            );
            
            expect(statusCode).to.equal(204);
            expect(payload).to.not.have.a.property('body');
        });

        it('is accepted and returns no content for non existend IDs', async function() {
            const {payload, statusCode, body} = await invokeLambdaForResponse(
                "MediaMappingService", 
                httpPayload({
                    method: "DELETE",
                    pathParameters: {
                        id: NIL_UUID
                    }
                })
            );
            
            expect(statusCode).to.equal(204);
            expect(payload).to.not.have.a.property('body');
        });
    });
  
})