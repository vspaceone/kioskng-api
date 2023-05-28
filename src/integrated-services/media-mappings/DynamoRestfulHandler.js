'use strict';

const { 
    DynamoDBClient, 
    GetItemCommand, ScanCommand, PutItemCommand, DeleteItemCommand, QueryCommand,
    ConditionalCheckFailedException } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const crypto = require('crypto')

const {DatabaseOperationException} = require('../utils/exceptions.js');

const AccountDynamoRestfulHandler = require('../accounts/DynamoRestfulHandler.js').DynamoRestfulHandler;
const accountModule = require('../accounts/app.js');

class DynamoRestfulHandler {

    constructor(region, tableName, payloadValidator) {
        this.ddClient = new DynamoDBClient({region: region});
        this.defaultPageSize = 10;
        this.tableName = tableName;
        this.payloadValidator = payloadValidator;

        this.accountDynamoRestfulHandler = new AccountDynamoRestfulHandler(accountModule.region, accountModule.tableName, accountModule.PayloadValidators);
    }

    async handleApiEvent(event){
        switch (event.httpMethod){
            case "GET":
                return await this.handleGet(event);
            case "PUT":
                return await this.handlePut(event);
            case "POST":
                return await this.handlePost(event);
            case "DELETE":
                return await this.handleDelete(event);
            default:
                return { statusCode: 501 }
        }
    }

    // ##################
    // ##### DELETE #####
    // ##################

    async handleDelete(event){
        if (!event || !event.pathParameters || !event.pathParameters.id){
            return { statusCode: 404 }
        }

        const command = new DeleteItemCommand({TableName: this.tableName, Key: marshall({id: event.pathParameters.id})});
        let response;

        try {
            response = await this.ddClient.send(command);
        } catch (e) {
            console.error("Error while calling DynamoDB.", e);
            return {
                statusCode: 500
            }
        }

        return { statusCode: 204 }
    }

    // ################
    // ##### POST #####
    // ################

    // not required for now?
    async handlePost(event){
        return { statusCode: 501 }
    }

    // ###############
    // ##### PUT #####
    // ###############

    async handlePut(event){
        const item = JSON.parse(event.body)
        const validate = this.payloadValidator.generatePutMediaMappingValidator();

        const valid = validate(item);

        if (!valid) {
            return {
                statusCode: 422,
                body: JSON.stringify(validate.errors)
            }
        }

        if ((await this.accountDynamoRestfulHandler.getItemByID(item.account_id)) === null){
            return {
                statusCode: 404,
                body: JSON.stringify({"error": "No account found with provided account_id."})
            }
        }

        if (await this.conflictingMappingExists(item)){
            return {
                statusCode: 422,
                body: JSON.stringify({"error": "Exact media-id with that media type is already mapped."})
            }
        }

        item.id = crypto.randomUUID();
        
        const command = new PutItemCommand({
            TableName: this.tableName,
            Item: marshall(item),
            ConditionExpression: "attribute_not_exists(id)"
        });

        let response;
        try {
            response = await this.ddClient.send(command)
        } catch (e) {
            console.error("Error while calling DynamoDB.", e);
            return {
                statusCode: 500
            }
        }

        return {
            statusCode: 200,
            body: item
        }
    }

    async conflictingMappingExists(item){
        // TODO this is inefficient, but not sure if there's any way to get this made within a condition expression
        const response = await this.getItemByMediaTypeAndIdentification(item.media_type, item.media_identification);
        if (response !== null){
            return true;
        }
        return false;
    }

    // ###############
    // ##### GET #####
    // ###############

    async handleGet(event){
        try {
            let data;

            if (event && event.pathParameters && event.pathParameters.id){
                data = await this.getItemByID(event.pathParameters.id)
            } else if (event && event.queryStringParameters && event.queryStringParameters.media_identification && event.queryStringParameters.media_type) {
                data = await this.getItemByMediaTypeAndIdentification(event.queryStringParameters.media_type,  event.queryStringParameters.media_identification)
            } else {            
                data = await this.getItems();
            }

            if (data === null){
                return {
                    statusCode: 404
                }
            }

            return {
                statusCode: 200,
                body: JSON.stringify(data)
            }
        } catch (e) {
            if (e instanceof DatabaseOperationException){
                return {
                    statusCode: 500,
                    body: e.message
                }
            }
            return {
                statusCode: 500,
                body: "Unhandled error"
            }
        }
    }

    async getItemByID(id){
        const command = new GetItemCommand({TableName: this.tableName, Key: marshall({ id: id })})
        let item;
        
        try {
            item = await this.ddClient.send(command);
        } catch (e) {
            throw new DatabaseOperationException("Error while calling DynamoDB.", e);
        }

        if (!item.Item){
            return null;
        }

        return unmarshall(item.Item);
    }

    async getItemByMediaTypeAndIdentification(media_type, media_identification){
        const command = new QueryCommand(
            {
                TableName: this.tableName,
                IndexName: 'media_identification-media_type-index',
                KeyConditionExpression: 'media_identification = :mi AND media_type = :mt',
                ExpressionAttributeValues: marshall({
                    ":mi": media_identification,
                    ":mt": media_type
                })
            });
        let item;
        
        try {
            item = await this.ddClient.send(command);
        } catch (e) {
            throw new DatabaseOperationException("Error while calling DynamoDB.", e);
        }

        const unmarshalledItems = item.Items.map((i) => unmarshall(i));

        if (unmarshalledItems.length === 0){
            return null;
        }

        return unmarshalledItems[0];
    }

    async getItems(){
        const command = new ScanCommand({TableName: this.tableName});
        let item;

        try {
            item = await this.ddClient.send(command);
        } catch (e) {
            throw new DatabaseOperationException("Error while calling DynamoDB.", e);
        }

        const unmarshalledItems = item.Items.map((i) => unmarshall(i));
        
        return unmarshalledItems;
    }

}

exports.DynamoRestfulHandler = DynamoRestfulHandler;