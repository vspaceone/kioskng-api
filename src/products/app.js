'use strict';

const { DynamoRestfulHandler } = require('./DynamoRestfulHandler.js');

const tableName = "products";

exports.handler = async (event, context) => {
    const restHandler = new DynamoRestfulHandler(tableName);
    return await restHandler.handleApiEvent(event);
};