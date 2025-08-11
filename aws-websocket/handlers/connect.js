const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  
  try {
    await ddb.put({
      TableName: process.env.TABLE_NAME,
      Item: {
        connectionId: connectionId,
        timestamp: new Date().toISOString()
      }
    }).promise();
    
    return {
      statusCode: 200,
      body: 'Connected'
    };
  } catch (err) {
    console.error('Error connecting:', err);
    return {
      statusCode: 500,
      body: 'Failed to connect: ' + JSON.stringify(err)
    };
  }
};