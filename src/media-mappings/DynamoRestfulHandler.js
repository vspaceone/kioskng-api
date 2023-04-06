const AWS = require('aws-sdk');
const crypto = require('crypto')

class DynamoRestfulHandler {

    constructor(tableName) {
        this.docClient = new AWS.DynamoDB.DocumentClient();
        this.defaultPageSize = 10;
        this.tableName = tableName;
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
        if (event && event.pathParameters && event.pathParameters.id){
            try {
                const response = await this.docClient.delete({TableName: this.tableName, Key: {id: event.pathParameters.id}}).promise()
                return {
                    statusCode: 201,
                    body: response
                }
            } catch (err) {
                return {
                    statusCode: 500,
                    body: response
                }
            }   
        }
        
        return { statusCode: 404 }
    }

    // ################
    // ##### POST #####
    // ################

    // not required for now?
    async handlePost(event){
        // TODO only do patch? Do a get and then a put after modification?
        /*const item = JSON.parse(event.body)

        if (event && event.pathParameters && event.pathParameters.id){
            let response = await this.docClient.({
                TableName: this.tableName,
                Item: item
            }).promise()
    
        }*/


        return { statusCode: 501 }
    }

    // ###############
    // ##### PUT #####
    // ###############

    async handlePut(event){
        const item = JSON.parse(event.body)

        item.id = crypto.randomUUID();
        
        let response = await this.docClient.put({
            TableName: this.tableName,
            Item: item
        }).promise()

        return {
            statusCode: 201,
            body: response
        }
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
        let item = await this.docClient.get({TableName: this.tableName, Key: { id: id }}).promise()

        return {
            statusCode: 200,
            body: JSON.stringify(item.Item)
        };
    }

    async getItemByMediaTypeAndIdentification(type, identification){
        let item = await this.docClient.get({TableName: this.tableName, Key: { media_identification: identification, media_type: type }}).promise()

        return {
            statusCode: 200,
            body: JSON.stringify(item.Item)
        };
    }

    async getItems(){
        let item = await this.docClient.scan({TableName: this.tableName}).promise()
        
        const response = {
            statusCode: 200,
            body: JSON.stringify(item.Items)
        };
        return response;
    }

}

exports.DynamoRestfulHandler = DynamoRestfulHandler;