// TODO From this: https://medium.com/assertqualityassurance/aws-lambda-integration-test-easier-than-you-might-think-a66a9d600916
const { fromUtf8, toUtf8 } = require("@aws-sdk/util-utf8-node");
const { invokeLambdaForResponse, testAndExtractLambdaResponse, httpPayload, isUuid, NIL_UUID } = require("../../helper");
const { expect } = require('chai')

describe("Transaction Service", function() {

    this.timeout(10000);

    let newestTransaction;

    describe("GET", () => {

        it('without parameters returns 200 with JSON array', async function() {
            const {statusCode, body} = await invokeLambdaForResponse(
                "TransactionService", 
                httpPayload({
                    method: "GET"
                })
            );
            
            expect(statusCode).to.equal(200);
            expect(body).to.be.an('array');

            newestTransaction = body.reduce(function(prev,current){
                return (prev.timestamp > current.timestamp) ? prev : current;
            })
        });

        it('with id path parameter returns 200 with JSON object with matching id', async function() {
            const {statusCode, body} = await invokeLambdaForResponse(
                "TransactionService", 
                httpPayload({
                    method: "GET",
                    pathParameters: {
                        "id": newestTransaction.id
                    }
                })
            );
            
            expect(statusCode).to.equal(200);
            expect(body).to.be.an('object');
            expect(body).to.have.a.property('id').that.equals(newestTransaction.id)
        });
    
        it('with query parameter account returns 200 with JSON array with only matching account', async function() {
            const {statusCode, body} = await invokeLambdaForResponse(
                "TransactionService", 
                httpPayload({
                    method: "GET",
                    queryStringParameters: {
                        "account_id": "15224736-f22c-4fb5-9496-ff7edb06c5d5"
                    }
                })
            );
            
            expect(statusCode).to.equal(200)
            expect(body).to.be.an('array');
            for (let entry of body){
                expect(entry).to.have.a.property('account_id').that.equals("15224736-f22c-4fb5-9496-ff7edb06c5d5")
            }
        });

        it('with query parameter account and latest returns 200 with JSON object with most recent entry', async function() {
            const {statusCode, body} = await invokeLambdaForResponse(
                "TransactionService", 
                httpPayload({
                    method: "GET",
                    queryStringParameters: {
                        "account_id": "15224736-f22c-4fb5-9496-ff7edb06c5d5",
                        "latest": "true"
                    }
                })
            );
            
            expect(statusCode).to.equal(200)
            expect(body).to.be.an('object');
            expect(body).to.have.a.property('account_id').that.equals("15224736-f22c-4fb5-9496-ff7edb06c5d5")
            expect(body).to.have.a.property('timestamp').that.equals(newestTransaction.timestamp)

        });

        /*it('with path parameter ean returns 404 without body when ean does not exist', async function() {
            const {payload, statusCode} = await invokeLambdaForResponse(
                "TransactionService", 
                httpPayload({
                    method: "GET",
                    pathParameters: {
                        "ean": NIL_UUID
                    }
                })
            );
            
            expect(statusCode).to.equal(404);
            expect(payload).to.not.have.a.property('body');
        });*/
    });

    describe('PUT', function(){

        describe('DEPOSIT action', function(){

            it('with negative amount is rejected', async function() {
                const {payload, statusCode, body} = await invokeLambdaForResponse(
                    "TransactionService", 
                    httpPayload({
                        method: "PUT",
                        body: {
                            "account_id": NIL_UUID,
                            "transaction_amount": -1000,
                            "action": "DEPOSIT"
                        }
                    })
                );
                
                expect(statusCode).to.equal(406);
            });

            it('is accepted and returns full payload with id', async function() {
                let lastTransaction = await invokeLambdaForResponse(
                    "TransactionService", 
                    httpPayload({
                        method: "GET",
                        queryStringParameters: {
                            "account_id": "15224736-f22c-4fb5-9496-ff7edb06c5d5",
                            "latest": "true"
                        }
                    })
                );

                let lastAmount = 0;
                if (lastTransaction.body !== undefined && lastTransaction.body.transaction_result !== undefined){
                    lastAmount = lastTransaction.body.transaction_result;
                }

                const {payload, statusCode, body} = await invokeLambdaForResponse(
                    "TransactionService", 
                    httpPayload({
                        method: "PUT",
                        body: {
                            "account_id": "15224736-f22c-4fb5-9496-ff7edb06c5d5",
                            "transaction_amount": 10,
                            "action": "DEPOSIT"
                        }
                    })
                );
                
                expect(statusCode).to.equal(200);
                expect(body).to.have.a.property('account_id').that.equals("15224736-f22c-4fb5-9496-ff7edb06c5d5");
                expect(body).to.have.a.property('transaction_amount').that.equals(10);

                expect(body).to.have.a.property('transaction_result').that.equals(lastAmount + 10);
            });

        });      


        describe('WITHDRAW action', function(){

            it('with positive amount is rejected', async function() {
                const {payload, statusCode, body} = await invokeLambdaForResponse(
                    "TransactionService", 
                    httpPayload({
                        method: "PUT",
                        body: {
                            "account_id": NIL_UUID,
                            "transaction_amount": 1000,
                            "action": "WITHDRAW"
                        }
                    })
                );
                
                expect(statusCode).to.equal(406);
            });

            it('is accepted and returns full payload with id', async function() {
                let lastTransaction = await invokeLambdaForResponse(
                    "TransactionService", 
                    httpPayload({
                        method: "GET",
                        queryStringParameters: {
                            "account_id": "15224736-f22c-4fb5-9496-ff7edb06c5d5",
                            "latest": "true"
                        }
                    })
                );

                let lastAmount = 0;
                if (lastTransaction.body && lastTransaction.body.transaction_result){
                    lastAmount = lastTransaction.body.transaction_result;
                }

                const {payload, statusCode, body} = await invokeLambdaForResponse(
                    "TransactionService", 
                    httpPayload({
                        method: "PUT",
                        body: {
                            "account_id": "15224736-f22c-4fb5-9496-ff7edb06c5d5",
                            "transaction_amount": -10,
                            "action": "WITHDRAW"
                        }
                    })
                );
                
                expect(statusCode).to.equal(200);
                expect(body).to.have.a.property('account_id').that.equals("15224736-f22c-4fb5-9496-ff7edb06c5d5");
                expect(body).to.have.a.property('transaction_amount').that.equals(-10);

                expect(body).to.have.a.property('transaction_result').that.equals(lastAmount - 10);
            });

        });
        
        describe('BUY_PRODUCT action', function(){

            // fails when there is not at least product.ean specified
            it('fails when product.ean is not specified', async function(){
                const {payload, statusCode, body} = await invokeLambdaForResponse(
                    "TransactionService", 
                    httpPayload({
                        method: "PUT",
                        body: {
                            "account_id": "15224736-f22c-4fb5-9496-ff7edb06c5d5",
                            "action": "BUY_PRODUCT"
                        }
                    })
                );

                expect(statusCode).to.equal(406);
            });


            // fails when transaction_amount is set
            it('fails when transaction_amount is set', async function(){
                const {payload, statusCode, body} = await invokeLambdaForResponse(
                    "TransactionService", 
                    httpPayload({
                        method: "PUT",
                        body: {
                            "account_id": "15224736-f22c-4fb5-9496-ff7edb06c5d5",
                            "action": "BUY_PRODUCT",
                            "transaction_amount": "-10",
                            "product": {
                                "ean": "5903175652393"
                            }
                        }
                    })
                );

                expect(statusCode).to.equal(422);
            });

            // combinations thereof?
            it('fails when transaction_amount is set and product.ean not', async function(){
                const {payload, statusCode, body} = await invokeLambdaForResponse(
                    "TransactionService", 
                    httpPayload({
                        method: "PUT",
                        body: {
                            "account_id": "15224736-f22c-4fb5-9496-ff7edb06c5d5",
                            "action": "BUY_PRODUCT",
                            "transaction_amount": "-10"
                        }
                    })
                );

                expect(statusCode).to.equal(422);
            });

            // fails when product.ean is unknown
            it('fails when product.ean not known', async function(){
                const {payload, statusCode, body} = await invokeLambdaForResponse(
                    "TransactionService", 
                    httpPayload({
                        method: "PUT",
                        body: {
                            "account_id": "15224736-f22c-4fb5-9496-ff7edb06c5d5",
                            "action": "BUY_PRODUCT",
                            "product": {
                                "ean": "000000000000"
                            }
                        }
                    })
                );

                console.log(body)
                expect(statusCode).to.equal(404);
            });

            // success when current/existing (!) product.ean specified
            it('succeeds when product.ean is known', async function(){
                let lastTransaction = await invokeLambdaForResponse(
                    "TransactionService", 
                    httpPayload({
                        method: "GET",
                        queryStringParameters: {
                            "account_id": "15224736-f22c-4fb5-9496-ff7edb06c5d5",
                            "latest": "true"
                        }
                    })
                );
                expect(lastTransaction).to.be.an('object')
                expect(lastTransaction).to.have.a.property('body');
                expect(lastTransaction.body).to.have.a.property('transaction_result');
                let lastAmount = 0;
                if (lastTransaction.body && lastTransaction.body.transaction_result){
                    lastAmount = lastTransaction.body.transaction_result;
                }

                const productResponse = await invokeLambdaForResponse(
                    "ProductService", 
                    httpPayload({
                        method: "GET"
                    })
                );

                expect(productResponse.body).to.be.an('array');
                const anyProduct = productResponse.body[0];
                expect(anyProduct).to.be.an('object')
                expect(anyProduct).to.have.a.property('ean');
                expect(anyProduct).to.have.a.property('price');

                const {payload, statusCode, body} = await invokeLambdaForResponse(
                    "TransactionService", 
                    httpPayload({
                        method: "PUT",
                        body: {
                            "account_id": "15224736-f22c-4fb5-9496-ff7edb06c5d5",
                            "action": "BUY_PRODUCT",
                            "product": {
                                "ean": anyProduct.ean
                            }
                        }
                    })
                );

                expect(statusCode).to.equal(200);
                expect(body).to.be.an('object');
                expect(body).to.have.a.property('product').that.deep.equals(anyProduct)
                expect(body).to.have.a.property('transaction_amount').that.equals(-anyProduct.price)
                expect(body).to.have.a.property('transaction_result').that.equals(lastAmount - anyProduct.price);
            });
        });

    });

    describe('DELETE', function(){
        it('is not implemented', async function() {
            const {payload, statusCode, body} = await invokeLambdaForResponse(
                "TransactionService", 
                httpPayload({
                    method: "DELETE",
                    pathParameters: {
                        id: NIL_UUID
                    }
                })
            );
            
            expect(statusCode).to.equal(501);
            expect(payload).to.not.have.a.property('body');
        });
    });
  
})