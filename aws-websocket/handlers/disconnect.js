const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  
  try {
    await ddb.delete({
      TableName: process.env.TABLE_NAME,
      Key: {
        connectionId: connectionId
      }
    }).promise();
    
    return {
      statusCode: 200,
      body: 'Disconnected'
    };
  } catch (err) {
    console.error('Error disconnecting:', err);
    return {
      statusCode: 500,
      body: 'Failed to disconnect: ' + JSON.stringify(err)
    };
  }
};