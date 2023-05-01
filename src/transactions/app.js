'use strict';

const { DynamoRestfulHandler } = require('./DynamoRestfulHandler.js');
const Ajv = require('ajv');

const region = process.env.AWS_REGION;
const tableName = process.env.DYNAMODB_TABLE_TRANSACTIONS;

exports.handler = async (event, context) => {
    const restHandler = new DynamoRestfulHandler(region, tableName, new PayloadValidators());
    return await restHandler.handleApiEvent(event);
};

class PayloadValidators {

    constructor(){
        this.ajv = new Ajv();
    }

    generatePutTransactionValidator() {
        return this.ajv.compile({
            type: "object",
            properties: {
                // id not allowed
                /*timestamp: {
                    type: "integer"
                },*/
                account_id: {
                    type: "string", 
                    pattern: "^[0-9a-fA-F]{8}\\b-[0-9a-fA-F]{4}\\b-[0-9a-fA-F]{4}\\b-[0-9a-fA-F]{4}\\b-[0-9a-fA-F]{12}$" // = UUID
                },
                transaction_amount: {
                    type: "integer"
                },
                /*transaction_result: {
                    type: "integer"
                },*/
                action: {
                    enum: ["BUY_PRODUCT","WITHDRAW","DEPOSIT"] // "CANCEL","INCONSISTENCY_CORRECTION" are possible values as well but can not be put through API
                },
                /*authentication: {
                    enum: ["USERNAME_PASSWORD","MEDIA_PIN","MEDIA_ONLY"]
                },
                device_type: {
                    enum: ["App", "PoS"]
                },
                device_name: {
                    type: "string"
                },*/
                product: {
                    type: "object"
                }
            },
            required: ["account_id", "action"],
            additionalProperties: false
        })
    }
}