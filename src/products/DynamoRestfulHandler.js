'use strict';

const { 
    DynamoDBClient, 
    GetItemCommand, ScanCommand, PutItemCommand, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

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
        if (!event || !event.queryStringParameters || !event.queryStringParameters.ean){
            return { statusCode: 404 }
        }

        const command = new DeleteItemCommand({TableName: this.tableName, Key: marshall({ean: event.queryStringParameters.ean})});
        let response;
        
        try {
            response = await this.ddClient.send(command);
        } catch (e) {
            console.error("Error while calling DynamoDB.", e);
            return {
                statusCode: 500
            }
        }

        return {
            statusCode: 201
        }
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
        const validate = this.payloadValidator.generatePutProductValidator();

        const valid = validate(item);

        if (!valid) {
            return {
                statusCode: 422,
                body: JSON.stringify(validate.errors)
            }
        }

        const command = new PutItemCommand({
            TableName: this.tableName,
            Item: marshall(item)
        })

        let response;
        try {
            response = await this.ddClient.send(command);
        } catch (e) {
            console.error("Error while calling DynamoDB.", e);
            return {
                statusCode: 500
            }
        }

        return {
            statusCode: 201
        }
    }

    // ###############
    // ##### GET #####
    // ###############

    async handleGet(event){
        if (event && event.queryStringParameters && event.queryStringParameters.ean){
            return await this.getItemByEan(event.queryStringParameters.ean)
        }
        
        return await this.getItems();
    }

    async getItemByEan(ean){
        const command = new GetItemCommand({TableName: this.tableName, Key: marshall({ ean: ean })});
        let item;
        
        try {
            item = await this.ddClient.send(command);
        } catch (e){
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
        const command = new ScanCommand({TableName: this.tableName})
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