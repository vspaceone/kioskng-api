'use strict';

const { 
    DynamoDBClient, 
    GetItemCommand, ScanCommand, PutItemCommand, DeleteItemCommand,
    ConditionalCheckFailedException } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const crypto = require('crypto');

class DynamoRestfulHandler {

    constructor(region, tableName, payloadValidator) {
        this.ddClient = new DynamoDBClient({region: region})
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

    async handlePost(event){
        if (!event || !event.pathParameters || !event.pathParameters.id){
            return { statusCode: 400 }
        }

        const id = event.pathParameters.id;

        // TODO only do patch? Do a get and then a put after modification?
        const item = JSON.parse(event.body)
        const validate = this.payloadValidator.generatePutAccountValidator();

        const valid = validate(item);

        if (!valid) {
            return {
                statusCode: 422,
                body: JSON.stringify(validate.errors)
            }
        }

        item.id = id;

        const command = new PutItemCommand({
            TableName: this.tableName,
            Item: marshall(item),
            ConditionExpression: "attribute_exists(id)"
        })
        let response;
        
        try {
            response = await this.ddClient.send(command);
        } catch (e) {

            if (e instanceof ConditionalCheckFailedException){
                return { statusCode: 404 }
            }

            console.error("Error while calling DynamoDB.", e);
            return {
                statusCode: 500
            }
        }

        return { statusCode: 201 }
    }

    // ###############
    // ##### PUT #####
    // ###############

    async handlePut(event){
        const item = JSON.parse(event.body)
        const validate = this.payloadValidator.generatePutAccountValidator();

        const valid = validate(item);

        if (!valid) {
            return {
                statusCode: 422,
                body: JSON.stringify(validate.errors)
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

    // ###############
    // ##### GET #####
    // ###############

    async handleGet(event){
        if (event && event.pathParameters && event.pathParameters.id){
            return await this.getItemByID(event.pathParameters.id)
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