#!/usr/bin/env node
// Simple dev server to test the website without needing to constantly
// upload to the ESP32.
// Requirements:
//  npm install -g express
// Run:
//  node server.js
const express = require('express');
const path = require('path');
const parseUrl = require('parseurl');

const app = express();
let port = 8000;
for (let i = 1; i < process.argv.length; i++) {
  if (process.argv[i] === '--port') {
    let val = parseInt(process.argv[i + 1], 10);
    if (val) {
      port = val;
      i++;
      break;
    }
  }
}
const url = `http://127.0.0.1:${port}`;

// Add static dir to server index, css, etc.
app.use(express.static(path.join(__dirname, '.tmp')));
// Add JSON request support
app.use(express.json());

// Only file we serve is index because everything else should be inlined
// const staticRoot = express.static(path.join(__dirname, '.tmp'));
// app.use(function (req, res, next) {
//   if (req.method !== 'GET' && req.method !== 'HEAD') {
//     return next();
//   }
//   const path = parseUrl(req).pathname
//   if (path === '/' || path === '/index.html') {
//     return staticRoot(req, res, next);
//   }
//   return next();
// });

const state = {
  connected: null,
};

const knownSSIDs = [
  { "ssid": "Pantum-AP-A6D49F", "chan": 11, "rssi": -55, "auth": 4 },
  { "ssid": "a0308", "chan": 1, "rssi": -56, "auth": 3 },
  { "ssid": "dlink-D9D8", "chan": 11, "rssi": -82, "auth": 4 },
  { "ssid": "Linksys06730", "chan": 7, "rssi": -85, "auth": 0 },
  { "ssid": "SINGTEL-5171", "chan": 9, "rssi": -88, "auth": 4 },
  { "ssid": "1126-1", "chan": 11, "rssi": -89, "auth": 4 },
  { "ssid": "The Shah 5GHz-2", "chan": 1, "rssi": -90, "auth": 3 },
  { "ssid": "SINGTEL-1D28 (2G)", "chan": 11, "rssi": -91, "auth": 3 },
  { "ssid": "dlink-F864", "chan": 1, "rssi": -92, "auth": 4 },
  { "ssid": "dlink-74F0", "chan": 1, "rssi": -93, "auth": 4 }
];

// API
app.get('/ap', (req, res) => {
  res.json(knownSSIDs);
});

app.get('/status', (req, res) => {
  res.json(state.connected);
});

app.delete('/connect', (req, res) => {
  state.connected = null;
  res.send('')
});

const octet = () => Math.floor(Math.random() * 256);

app.post('/connect', (req, res) => {
  const ssid = req.headers['x-custom-ssid'];
  const pass = req.headers['x-custom-pass'];

  let found = null;
  for (var i = 0; i < knownSSIDs.length; i++) {
    if (knownSSIDs[i].ssid === ssid) {
      found = knownSSIDs[i];
      break;
    }
  }
  if (!found) {
    return res.send('ssid');
  }
  if (found.auth && !pass) {
    return res.send('pass');
  }

  state.connected = {
    "ssid": ssid,
    "ip": `192.168.${octet()}.${octet()}`,
    "netmask": "255.255.255.0",
    "gw": `192.168.${octet()}.${octet()}`,
    "urc": 0
  };
  res.send('') // sends empty response on success
  // on error sends 404
});

app.get('/settings', (req, res) => {
  setTimeout(function(){
    res.json(
      [
        {
          "key": "color",
          "type": "radio",
          "label": "Color",
          "value": "green",
          size: 6,
          "options": "red\tRed\ngreen\tGreen\nblue\tBlue"
        },
        {
          "key": "service",
          "type": "select",
          "label": "Select a service",
          "value": "svc2",
          size: 5,
          "options": "svc1\tService #1\nsvc2\tService #2\nsvc3\tService #3"
        },
        {
          "key": "token",
          "type": "text",
          "label": "Enter your secret token",
          "value": "",
          size: 33,
          "options": null
        },
        {
          key: 'toppings',
          type: 'checkbox',
          label: 'Toppings',
          value: null,
          size: 22,
          options: "tomato\tTomato\ncheese\tCheese\npep\tPepperoni"
        },
        {
          key: 'sshkey',
          type: 'textarea',
          label: 'Public Key',
          value: null,
          size: 55,
          options: null,
        }
      ]
    );
  }, 0);
});

app.post('/settings', function(err, res) {
  res.send('');
});

// Start server
app.listen(port, () => console.log(`Listening at ${url}`));
