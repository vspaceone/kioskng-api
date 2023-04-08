const AWS = require('aws-sdk');

class DynamoRestfulHandler {

    constructor(tableName, payloadValidator) {
        this.docClient = new AWS.DynamoDB.DocumentClient();
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
        if (event && event.queryStringParameters && event.queryStringParameters.ean){
            try {
                const response = await this.docClient.delete({TableName: this.tableName, Key: {ean: event.queryStringParameters.ean}}).promise()
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
        if (event && event.queryStringParameters && event.queryStringParameters.ean){
            return await this.getItemByEan(event.queryStringParameters.ean)
        }
        
        return await this.getItems();
    }

    async getItemByEan(ean){
        let item = await this.docClient.get({TableName: this.tableName, Key: { ean: ean }}).promise()

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