#!/usr/bin/env node

var noble = require('noble');


noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    console.log("Starting scan.");
    noble.startScanning();
  } else {
    console.log("Stopping scan.");
    noble.stopScanning();
  }
});

noble.on('discover', function(peripheral) {
  console.log("Peripheral discovered!")
  console.log("  Name: " + peripheral.advertisement.localName)
  console.log("  UUID: " + peripheral.uuid);
  console.log("  rssi: " + peripheral.rssi);
});


noble.on('scanStop', function() { 
    ///process.exit();
    this.startScanning(); 
});

noble.on('scanStart', function() { 
process.stdout.clearLine();
var _this = this;
        setTimeout(function(){
            console.log("timeout Stopping scan.");
            _this.stopScanning();
        }, 10 * 1000);    
});
