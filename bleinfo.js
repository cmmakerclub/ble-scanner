#!/usr/bin/env node

var async = require('async');
var async_q = require ('async-q')
var noble = require('noble');
var Q = require('q'); 

var peripheralUuid = process.argv[2];

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});

var onDisCover =  function(peripheral) {
  if (peripheral.uuid === peripheralUuid) {
    noble.stopScanning();

    console.log('peripheral with UUID ' + peripheralUuid + ' found');
    var advertisement = peripheral.advertisement;

    var localName = advertisement.localName;
    var txPowerLevel = advertisement.txPowerLevel;
    var manufacturerData = advertisement.manufacturerData;
    var serviceData = advertisement.serviceData;
    var serviceUuids = advertisement.serviceUuids;

    if (localName) {
      console.log('  Local Name        = ' + localName);
    }

    if (txPowerLevel) {
      console.log('  TX Power Level    = ' + txPowerLevel);
    }

    if (manufacturerData) {
      console.log('  Manufacturer Data = ' + manufacturerData.toString('hex'));
    }

    if (serviceData) {
      console.log('  Service Data      = ' + serviceData);
    }

    if (localName) {
      console.log('  Service UUIDs     = ' + serviceUuids);
    }

    console.log();

    explore(peripheral);
  }
}

noble.on('discover', onDisCover);


function explore(peripheral) {
  console.log('services and characteristics:');

  peripheral.on('disconnect', function() {
    process.exit(0);
  });


  var serviceIndex = 0;
  var makeOnDiscoverDescriptorsFn = function(callback, characteristicInfo) {
      var onDiscoverDescriptors = function(error, descriptors) {
          async.detect(
            descriptors,
            function(descriptor, callback) {
              return callback(descriptor.uuid === '2901');
            },
            function(userDescriptionDescriptor){
              if (userDescriptionDescriptor) {
                userDescriptionDescriptor.readValue(function(error, data) {
                  characteristicInfo += ' (' + data.toString() + ')';
                  callback();
                });
              } else {
                callback();
              }
            }
          );
      }
      return onDiscoverDescriptors;
  } 


  var makeOnDiscoverCharacteristicsFn = function(callback) {
      var characteristicIndex = 0;

      var getDescriptorsInfo = function(callback, characteristic, characteristicInfo) {
        
          var series = {
            // step-1
            step1: function(callback) {
              var onDiscoverDescriptors = makeOnDiscoverDescriptorsFn(callback, characteristicInfo);
              characteristic.discoverDescriptors(onDiscoverDescriptors);
            },
            // step-2
            step2: function(callback) {
              characteristicInfo += '\n    properties  ' + characteristic.properties.join(', ');
              if (characteristic.properties.indexOf('read') !== -1) {
                characteristic.read(function(error, data) {
                  if (data) {
                    var string = data.toString('ascii');

                    characteristicInfo += '\n    value       ' + data.toString('hex') + ' | \'' + string + '\'';
                  }
                  callback();
                });
              } else {
                callback();
              }
            }

          }
          
          var seriesAllDone = function() {
              console.log(characteristicInfo);
              characteristicIndex++;
              callback();
          }

          async.series( series, seriesAllDone);
      }

      var onDiscoverCharacteristics =  function(error, characteristics) {
          var errFn = function(error) {
              serviceIndex++;
              callback();
          }

          var testCondition = function () {
              return (characteristicIndex < characteristics.length);
          }

          var workerFn = function(callback) {
              var characteristic = characteristics[characteristicIndex];
              var characteristicInfo = '  ' + characteristic.uuid;

              if (characteristic.name) {
                characteristicInfo += ' (' + characteristic.name + ')';
              }

              getDescriptorsInfo(callback, characteristic, characteristicInfo);
          }

          async.whilst( testCondition, workerFn, errFn );
      } 
      return onDiscoverCharacteristics;
  }


  var onDiscoverServices = function(error, services) {
      var errFn = function (err) {
          peripheral.disconnect();
      }

      var testCondition = function () {
          return (serviceIndex < services.length);
      }

      var workerFn = function(callback) {
          var service = services[serviceIndex];
          var serviceInfo = service.uuid;

          if (service.name) {
            serviceInfo += ' (' + service.name + ')';
          }
          console.log(serviceInfo);
        
          var onDiscoverCharacteristics = makeOnDiscoverCharacteristicsFn(callback);

          service.discoverCharacteristics([], onDiscoverCharacteristics);
      }

      async.whilst( testCondition , workerFn , errFn );
  }

  var onConnect = function(error) {
    peripheral.discoverServices([], onDiscoverServices);
  }

  peripheral.connect(onConnect);

}