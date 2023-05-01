'use strict';

const { DynamoRestfulHandler } = require('./DynamoRestfulHandler.js');
const Ajv = require('ajv');

const region = process.env.RUNTIME_REGION;
const tableName = process.env.DYNAMODB_TABLE_ACCOUNTS;

exports.handler = async (event, context) => {
    const restHandler = new DynamoRestfulHandler(region, tableName, new PayloadValidators());
    return await restHandler.handleApiEvent(event);
};

class PayloadValidators {

    constructor(){
        this.ajv = new Ajv();
    }

    generatePutAccountValidator() {
        return this.ajv.compile({
            type: "object",
            properties: {
                /*id: {
                    type: "string", 
                    pattern: "^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$" // = UUID
                },*/
                fullname: {
                    type: "string"
                },
                street: {
                    type: "string"
                },
                post_code: {
                    type: "string"
                },
                city: {
                    type: "string"
                },
                pin: {
                    type: "string",
                    pattern: "^[0-9]{4}$"
                }
            },
            required: ["fullname", "street", "post_code", "city"],
            additionalProperties: false
        })
    }
}

exports.PayloadValidators = PayloadValidators;
exports.region = region;
exports.tableName = tableName;