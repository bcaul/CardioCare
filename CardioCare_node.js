const SerialPort = require('serialport');
const http = require('http');
const WebSocket = require('ws');

// serial port
const portName = 'COM6';
const baudRate = 9600;
const port = new SerialPort(portName, { baudRate: baudRate });

// store incoming serial data
let serialData = '';


// webSocket server
const serverWS = new WebSocket.Server({ port: 3000 });

// listen for serial data
port.on('data', (data) => {
  // appending received data to serialData
  serialData += data.toString();
  
  // check for newline character indicating end of data
  if (serialData.includes('\n')) {
    const dataArray = serialData.split('\n');
    const lastData = dataArray.pop(); 

    // process complete data entries
    dataArray.forEach(processData);
    
    // keep the incomplete data for the next iteration
    serialData = lastData;
  }
});

// process each complete data entry
function processData(data) {
  console.log('Received data from Arduino:', data);
  const BPM = calculateBPM(data); 
  console.log('BPM:', BPM);
  sendNotificationToWebSocket(data, BPM);
  if (!isNaN(BPM) && BPM > 140) {
    console.log('High BPM detected. Sending highBPM message.');
    sendHighBPMNotification();
  }
}

// calculate BPM
function calculateBPM(data) {
  const index = data.indexOf('BPM: ');
  if (index !== -1) { 
    const bpmSubstring = data.substring(index + 5);
    const bpm = parseInt(bpmSubstring);
    if (!isNaN(bpm)) {
      return bpm;
    }
  }
  // return NaN if BPM value cannot be parsed
  return NaN;
}

// send notification to WebSocket clients
function sendNotificationToWebSocket(data, BPM) {
  serverWS.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      console.log('Sending notification to client:', data);
      client.send(JSON.stringify({ type: 'notification', message: data }));
      if (!isNaN(BPM)) {
        if (BPM < 60) {
          console.log('Low BPM detected. Sending lowBPM message.');
          client.send(JSON.stringify({ type: 'lowBPM', message: 'BPM dropped below 60!' }));
        }
      }
    }
  });
}

// send high BPM notification to WebSocket clients
function sendHighBPMNotification() {
  serverWS.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'highBPM', message: 'BPM exceeded 140!' }));
    }
  });
}

// start listening on serial port
port.on('open', () => {
  console.log('Serial port opened');
});
