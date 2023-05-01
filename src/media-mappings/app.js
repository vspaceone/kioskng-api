'use strict';

const { DynamoRestfulHandler } = require('./DynamoRestfulHandler.js');
const Ajv = require('ajv');

const region = process.env.AWS_REGION;
const tableName = process.env.DYNAMODB_TABLE_MEDIA_MAPPINGS;

exports.handler = async (event, context) => {
    const restHandler = new DynamoRestfulHandler(region, tableName, new PayloadValidators());
    return await restHandler.handleApiEvent(event);
};

class PayloadValidators {

    constructor(){
        this.ajv = new Ajv();
    }

    generatePutMediaMappingValidator() {
        return this.ajv.compile({
            type: "object",
            properties: {
                // id not allowed
                media_identification: {
                    type: "string"
                },
                account_id: {
                    type: "string", 
                    pattern: "^[0-9a-fA-F]{8}\\b-[0-9a-fA-F]{4}\\b-[0-9a-fA-F]{4}\\b-[0-9a-fA-F]{4}\\b-[0-9a-fA-F]{12}$" // = UUID
                },
                media_type: {
                    enum: ["RFID_ID", "QR_CODE_EXACT_MATCH", "APP_NFC", "APP_TOKEN"]
                },
                device_type: {
                    enum: ["App", "PoS"]
                },
                device_name: {
                    type: "string"
                },
                valid_till_timestamp: {
                    type: "integer"
                }
            },
            required: ["media_identification", "account_id", "media_type"],
            additionalProperties: false
        })
    }
}