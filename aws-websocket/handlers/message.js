const AWS = require('aws-sdk');
const WebSocket = require('ws');
const https = require('https');
const ddb = new AWS.DynamoDB.DocumentClient();

// Store SMS-Timing data globally (Lambda container reuse)
let lastSMSData = null;

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const apiGateway = new AWS.ApiGatewayManagementApi({
    endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
  });
  
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (err) {
    console.error('Invalid JSON:', err);
    return { statusCode: 400, body: 'Invalid JSON' };
  }
  
  try {
    switch (data.action) {
      case 'join_race':
        console.log('🏁 Cliente solicitó unirse a carreras en vivo');
        
        // Store connection as race viewer
        await ddb.update({
          TableName: process.env.TABLE_NAME,
          Key: { connectionId },
          UpdateExpression: 'SET sessionName = :session, connectionType = :type',
          ExpressionAttributeValues: {
            ':session': 'live_race',
            ':type': 'race_viewer'
          }
        }).promise();
        
        // Trigger SMS-Timing connection check
        await initOrCheckSMSConnection();
        
        // Send last data if available
        if (lastSMSData) {
          await apiGateway.postToConnection({
            ConnectionId: connectionId,
            Data: lastSMSData
          }).promise();
        }
        
        // Send confirmation
        await apiGateway.postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify({
            type: 'race_joined',
            message: 'Conectado a carreras en vivo'
          })
        }).promise();
        break;
        
      case 'request_data':
        // Send last SMS data if available
        if (lastSMSData) {
          await apiGateway.postToConnection({
            ConnectionId: connectionId,
            Data: lastSMSData
          }).promise();
        } else {
          await apiGateway.postToConnection({
            ConnectionId: connectionId,
            Data: JSON.stringify({
              type: 'no_data',
              message: 'No hay datos de carrera disponibles'
            })
          }).promise();
        }
        break;
        
      default:
        // Echo back to sender
        await apiGateway.postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify({
            type: 'echo',
            data: data
          })
        }).promise();
    }
    
    return { statusCode: 200, body: 'Message sent' };
    
  } catch (err) {
    console.error('Error handling message:', err);
    return { statusCode: 500, body: 'Failed to process message: ' + JSON.stringify(err) };
  }
};

// Function to initiate SMS-Timing connection
async function initOrCheckSMSConnection() {
  try {
    // Since Lambda can't maintain persistent connections, we'll trigger
    // a separate service or use EventBridge to handle SMS-Timing
    console.log('🔗 Iniciando conexión SMS-Timing...');
    
    // For now, we'll simulate the connection with stored data
    // In production, this would trigger an external service
    
  } catch (error) {
    console.error('Error iniciando SMS-Timing:', error);
  }
}

// Function to store SMS data (called by external source)
exports.storeSMSData = async (smsData) => {
  try {
    lastSMSData = JSON.stringify(smsData);
    console.log('📊 SMS data stored:', smsData.N, '- Pilotos:', smsData.D?.length || 0);
    
    // Broadcast to all race viewers
    await broadcastToRaceViewers(lastSMSData);
    
  } catch (error) {
    console.error('Error storing SMS data:', error);
  }
};

// Function to broadcast to all race viewers
async function broadcastToRaceViewers(data) {
  try {
    // Get all race viewer connections
    const connections = await ddb.query({
      TableName: process.env.TABLE_NAME,
      IndexName: 'SessionIndex',
      KeyConditionExpression: 'sessionName = :session',
      ExpressionAttributeValues: {
        ':session': 'live_race'
      }
    }).promise();
    
    if (connections.Items.length === 0) {
      console.log('No hay espectadores conectados');
      return;
    }
    
    const apiGateway = new AWS.ApiGatewayManagementApi({
      endpoint: process.env.WEBSOCKET_ENDPOINT
    });
    
    // Broadcast to all connections
    const postCalls = connections.Items.map(async ({ connectionId: targetId }) => {
      try {
        await apiGateway.postToConnection({
          ConnectionId: targetId,
          Data: data
        }).promise();
      } catch (e) {
        if (e.statusCode === 410) {
          // Remove stale connections
          await ddb.delete({
            TableName: process.env.TABLE_NAME,
            Key: { connectionId: targetId }
          }).promise();
        }
      }
    });
    
    await Promise.all(postCalls);
    console.log(`📡 Datos enviados a ${connections.Items.length} espectadores`);
    
  } catch (error) {
    console.error('Error broadcasting to race viewers:', error);
  }
}