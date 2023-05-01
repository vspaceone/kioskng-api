'use strict';

const { DynamoRestfulHandler } = require('./DynamoRestfulHandler.js');
const Ajv = require('ajv');

const region = process.env.AWS_REGION;
const tableName = process.env.DYNAMODB_TABLE_PRODUCTS;

exports.handler = async (event, context) => {
    const restHandler = new DynamoRestfulHandler(region, tableName, new PayloadValidators());
    return await restHandler.handleApiEvent(event);
};

class PayloadValidators {

    constructor(){
        this.ajv = new Ajv();
    }

    generatePutProductValidator() {
        return this.ajv.compile({
            type: "object",
            properties: {
                ean: {
                    type: "string"
                },
                price: {
                    type: "integer", 
                    minimum: 1
                },
                description: {
                    type: "string"
                },
                name: {
                    type: "string"
                },
                images: {
                    type: "array",
                    uniqueItems: true,
                    items: {
                        type: "string",
                        pattern: "^(https:\\/\\/.)[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)$" // = https (s!) URL
                    }
                }
            },
            required: ["ean", "price", "description", "name", "images"],
            additionalProperties: false
        })
    }
}

exports.PayloadValidators = PayloadValidators;
exports.tableName = tableName;
exports.region = region;