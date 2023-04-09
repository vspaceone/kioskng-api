'use strict';

const AWS = require('aws-sdk');
const { 
    DynamoDBClient, 
    GetItemCommand, ScanCommand, PutItemCommand, DeleteItemCommand, QueryCommand,
    ConditionalCheckFailedException } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const crypto = require('crypto')

class DynamoRestfulHandler {

    constructor(region, tableName, payloadValidator) {
        this.docClient = new AWS.DynamoDB.DocumentClient();
        this.ddClient = new DynamoDBClient({region: region});
        this.defaultPageSize = 10;
        this.tableName = tableName;
        this.payloadValidator = payloadValidator;
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

        return { statusCode: 201 }
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

        if (await this.conflictingMappingExists(item)){
            return {
                statusCode: 422,
                body: {"error": "Exact media-id with that media type is already mapped."}
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
        if (response && response.statusCode === 200){
            return true;
        }
        return false;
    }

    // ###############
    // ##### GET #####
    // ###############

    async handleGet(event){
        if (event && event.pathParameters && event.pathParameters.id){
            return await this.getItemByID(event.pathParameters.id)
        } else if (event && event.queryStringParameters && event.queryStringParameters.media_identification && event.queryStringParameters.media_type) {
            return await this.getItemByMediaTypeAndIdentification(event.queryStringParameters.media_type,  event.queryStringParameters.media_identification)
        }
        
        return await this.getItems();
    }

    async getItemByID(id){
        const command = new GetItemCommand({TableName: this.tableName, Key: marshall({ id: id })})
        let item;
        
        try {
            item = await this.ddClient.send(command);
        } catch (e) {
            console.error("Error while calling DynamoDB.", e);
            return {
                statusCode: 500
            }
        }

        if (!item.Item){
            return {
                statusCode: 404
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(unmarshall(item.Item))
        };
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
            console.error("Error while calling DynamoDB.", e);
            return {
                statusCode: 500
            }
        }

        const unmarshalledItems = item.Items.map((i) => unmarshall(i));

        if (unmarshalledItems.length === 0){
            return { statusCode: 404 }
        }

        return {
            statusCode: 200,
            body: JSON.stringify(unmarshalledItems[0])
        };
    }

    async getItems(){
        const command = new ScanCommand({TableName: this.tableName});
        let item;

        try {
            item = await this.ddClient.send(command);
        } catch (e) {
            console.error("Error while calling DynamoDB.", e);
            return {
                statusCode: 500
            }
        }

        const unmarshalledItems = item.Items.map((i) => unmarshall(i));
        
        const response = {
            statusCode: 200,
            body: JSON.stringify(unmarshalledItems)
        };
        return response;
    }

}

exports.DynamoRestfulHandler = DynamoRestfulHandler;