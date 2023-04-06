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
        // TODO Transactions by design can NEVER be deleted, only a cancellation transaction can be made

        // TODO get transaction by event.pathParameters.id

        // TODO reuse this transaction but set action to CANCEL, negate the amount and recalculate the result
        
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
        const transactionUUID = crypto.randomUUID();

        item.id = transactionUUID;

        // TODO validate if account_id, action, auth and location have plausible values or generate them
        
        // TODO get "last" transaction for same account_id or assume to start off with 0 balance
        // TODO the last transaction must be queried "strongly consistent" to make sure it reflect the most recent value
        let assumedLastBalance = 0;

        // TODO check plausibility of item.transaction_amount in comparison with item.action, if the latter is "BUY_PRODUCT" then we need to always retrieve price from products table
        if (item.action === "WITHDRAW") {
            if (!(item.transaction_amount < 0)){
                return {
                    statusCode: 406,
                    body: "WITHDRAW action was specified but item.transaction_amount is not a negative number"
                }
            }

        } else if (item.action === "DEPOSIT") {
            if (!(item.transaction_amount > 0)){
                return {
                    statusCode: 406,
                    body: "DEPOSIT action was specified but item.transaction_amount is not a positive number"
                }
            }
        }

        item.transaction_result = assumedLastBalance + item.transaction_amount;        
        
        if (item.action === "BUY_PRODUCT" && item.product){
            // TODO we expect to at least get PRODUCT_EAN here and will always (!) override item.product to ensure consistency
            // TODO additionally we will recalculate item.transaction_result and set item.transaction_amount to -price of the product
        } else if (item.action === "BUY_PRODUCT" && !item.product){
            // TODO If no products specified this operation should fail
            return {
                statusCode: 406,
                body: "BUY_PRODUCT action was specified but no valid value for product.ean was found"
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
        if (event && event.pathParameters && event.pathParameters.account_id){
            return await this.getItemByAccountID(event.pathParameters.account_id)
        }
        
        return await this.getItems();
    }

    async getItemByAccountID(id){
        let item = await this.docClient.get({TableName: this.tableName, Key: { account_id: id }}).promise()

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