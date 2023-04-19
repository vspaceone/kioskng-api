// TODO From this: https://medium.com/assertqualityassurance/aws-lambda-integration-test-easier-than-you-might-think-a66a9d600916
const { fromUtf8, toUtf8 } = require("@aws-sdk/util-utf8-node");
const { invokeLambdaForResponse ,testAndExtractLambdaResponse, httpPayload, isUuid, NIL_UUID } = require("../../helper");
const { expect } = require('chai')

describe("Product Service", function() {

    this.timeout(10000);

    let productEanCreated;

    describe("GET", () => {
        let anyEan;

        it('without parameters returns 200 with JSON array', async function() {
            const {statusCode, body} = await invokeLambdaForResponse(
                "ProductService", 
                httpPayload({
                    method: "GET"
                })
            );
            
            expect(statusCode).to.equal(200);
            expect(body).to.be.an('array');
            anyEan = body[0].ean;
        });
    
        it('with path parameter ean returns 200 with JSON object with matching ean', async function() {
            const {statusCode, body} = await invokeLambdaForResponse(
                "ProductService", 
                httpPayload({
                    method: "GET",
                    pathParameters: {
                        "ean": anyEan
                    }
                })
            );
            
            expect(statusCode).to.equal(200)
            expect(body).to.be.an('object');
            expect(body).to.have.a.property('ean').that.equals(anyEan)
        });

        it('with path parameter ean returns 404 without body when ean does not exist', async function() {
            const {payload, statusCode} = await invokeLambdaForResponse(
                "ProductService", 
                httpPayload({
                    method: "GET",
                    pathParameters: {
                        "ean": NIL_UUID
                    }
                })
            );
            
            expect(statusCode).to.equal(404);
            expect(payload).to.not.have.a.property('body');
        });
    });

    describe('PUT', function(){
        it('is accepted and returns full payload with id', async function() {
            const {payload, statusCode, body} = await invokeLambdaForResponse(
                "ProductService", 
                httpPayload({
                    method: "PUT",
                    body: {
                        "ean": "1234567890123",
                        "price": 1234,
                        "description": "Product description",
                        "images": [
                            "https://example.org/image.png"
                        ],
                        "name": "Example product"
                    }
                })
            );
            
            expect(statusCode).to.equal(200);
            expect(body).to.have.a.property('ean').that.equals('1234567890123')
            productEanCreated = body.ean;
            expect(body).to.have.a.property('price').that.equals(1234)
            expect(body).to.have.a.property('description').that.equals("Product description")
            expect(body).to.have.a.property('images').is.an('array')
            expect(body).to.have.a.property('name').that.equals("Example product")
        });
    });

    describe('DELETE', function(){
        it('is accepted and returns no content', async function() {
            const {payload, statusCode, body} = await invokeLambdaForResponse(
                "ProductService", 
                httpPayload({
                    method: "DELETE",
                    pathParameters: {
                        ean: productEanCreated
                    }
                })
            );
            
            expect(statusCode).to.equal(204);
            expect(payload).to.not.have.a.property('body');
        });

        it('is accepted and returns no content for non existend IDs', async function() {
            const {payload, statusCode, body} = await invokeLambdaForResponse(
                "ProductService", 
                httpPayload({
                    method: "DELETE",
                    pathParameters: {
                        ean: NIL_UUID
                    }
                })
            );
            
            expect(statusCode).to.equal(204);
            expect(payload).to.not.have.a.property('body');
        });
    });
  
})