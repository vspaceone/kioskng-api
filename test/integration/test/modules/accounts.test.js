const { invokeLambdaForResponse, httpPayload, isUuid, NIL_UUID } = require("../../helper");
const { expect } = require('chai')

describe("Account Service", function() {

    this.timeout(10000);

    let accountIdCreated;

    describe("GET", () => {
        let anyAccountId;

        it('without parameters returns 200 with JSON array', async function() {
            const {statusCode, body} = await invokeLambdaForResponse(
                "AccountService", 
                httpPayload({
                    method: "GET"
                })
            );
            
            expect(statusCode).to.equal(200);
            expect(body).to.be.an('array');

            anyAccountId = body[0].id;
        });
    
        it('with path parameter id returns 200 with JSON object with matching id', async function() {
            const {statusCode, body} = await invokeLambdaForResponse(
                "AccountService", 
                httpPayload({
                    method: "GET",
                    pathParameters: {
                        "id": anyAccountId
                    }
                })
            );
            
            expect(statusCode).to.equal(200);
            expect(body).to.be.an('object');
            expect(body).to.have.a.property('id').that.equals(anyAccountId);
        });

        it('with path parameter id returns 404 without body when id does not exist', async function() {
            const {payload, statusCode} = await invokeLambdaForResponse(
                "AccountService", 
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
                "AccountService", 
                httpPayload({
                    method: "PUT",
                    body: {
                        "id": NIL_UUID,
                        "fullname": "Hans Vader",
                        "street": "Galactic Road 000",
                        "post_code": "00000",
                        "city": 'Milky Highway',
                        "pin": '0000'
                    }
                })
            );
            
            expect(statusCode).to.equal(422);
        });

        it('is accepted and returns full payload with id', async function() {
            const {statusCode, body} = await invokeLambdaForResponse(
                "AccountService", 
                httpPayload({
                    method: "PUT",
                    body: {
                        "fullname": "Hans Vader",
                        "street": "Galactic Road 000",
                        "post_code": "00000",
                        "city": 'Milky Highway',
                        "pin": '0000'
                    }
                })
            );
            
            expect(statusCode).to.equal(200);
            expect(isUuid(body.id)).to.be.true;
            accountIdCreated = body.id;
            expect(body).to.have.a.property("fullname").that.equals("Hans Vader");
            expect(body).to.have.a.property("street").that.equals("Galactic Road 000");
            expect(body).to.have.a.property("post_code").that.equals("00000");
            expect(body).to.have.a.property("city").that.equals('Milky Highway');
            expect(body).to.have.a.property("pin").that.equals('0000');
        });
    });

    describe('POST', function(){
        it('with id field is rejected (payload does not match schema)', async function() {
            const {statusCode} = await invokeLambdaForResponse(
                "AccountService", 
                httpPayload({
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
            );
            
            expect(statusCode).to.equal(422);
        });

        it('with non existend id returns 404', async function() {
            const {statusCode} = await invokeLambdaForResponse(
                "AccountService", 
                httpPayload({
                    method: "POST",
                    pathParameters: {
                        id: NIL_UUID
                    },
                    body: {
                        "fullname": "Hans Bader",
                        "street": "Galactic Boulevard 000",
                        "post_code": "00001",
                        "city": 'Milky Street',
                        "pin": '0001'
                    }
                })
            );
            
            expect(statusCode).to.equal(404);
        });

        it('is accepted and returns full changed payload with id', async function() {
            const {statusCode, body} = await invokeLambdaForResponse(
                "AccountService", 
                httpPayload({
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
            );

            expect(statusCode).to.equal(200);
            expect(isUuid(body.id)).to.be.true;
            expect(body).to.have.a.property("fullname").that.equals("Hans Bader");
            expect(body).to.have.a.property("street").that.equals("Galactic Boulevard 000");
            expect(body).to.have.a.property("post_code").that.equals("00001");
            expect(body).to.have.a.property("city").that.equals('Milky Street');
            expect(body).to.have.a.property("pin").that.equals('0001');
        });
    });

    describe('DELETE', function(){
        it('is accepted and returns no content', async function() {
            const {payload, statusCode, body} = await invokeLambdaForResponse(
                "AccountService", 
                httpPayload({
                    method: "DELETE",
                    pathParameters: {
                        id: accountIdCreated
                    }
                })
            );
            
            expect(statusCode).to.equal(204);
        });

        it('is accepted and returns no content for non existend IDs', async function() {
            const {payload, statusCode, body} = await invokeLambdaForResponse(
                "AccountService", 
                httpPayload({
                    method: "DELETE",
                    pathParameters: {
                        id: NIL_UUID
                    }
                })
            );
            
            expect(statusCode).to.equal(204);
        });
    });
  
})