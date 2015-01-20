#!/usr/bin/env node

var async = require('async');
var async_q = require ('async-q')
var noble = require('noble');
var Q = require('q'); 

// var peripheralUuid = process.argv[2];
var peripheralUuid = "431f28bb9a6f48d598a7e0d1f3f40e38"

var DEBUG = false;

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

    var advertisement = peripheral.advertisement;

    var localName = advertisement.localName;
    var txPowerLevel = advertisement.txPowerLevel;
    var manufacturerData = advertisement.manufacturerData;
    var serviceData = advertisement.serviceData;
    var serviceUuids = advertisement.serviceUuids;

    if (DEBUG) {
        console.log('peripheral with UUID ' + peripheralUuid + ' found');
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
          console.log('  Service Data      = ', serviceData);
        }

        if (localName) {
          console.log('  Service UUIDs     = ' + serviceUuids);
        }

        console.log();
    }

    explore(peripheral);
  }
}

noble.on('discover', onDisCover);


var counter = 0;
var onGotOurData = function(peripheral, data) {
  if (counter >= 2) {
    console.log(counter, data);
    peripheral.disconnect();
  }
  else {
    counter++;
  }
}


function explore(peripheral) {
  if (DEBUG)  {
    console.log('services and characteristics:');
  }

  peripheral.on('disconnect', function() {
    console.log("GOT DISCONNECT SIGNAL");
    process.exit(0);
  });


  var serviceIndex = 0;
  var makeOnDiscoverDescriptorsFn = function(callback, dataRef) {
      var onDiscoverDescriptors = function(error, descriptors) {
          async.detect(
            descriptors,
            function(descriptor, callback) {
              return callback(descriptor.uuid === '2901');
            },
            function(userDescriptionDescriptor){
              if (userDescriptionDescriptor) {
                userDescriptionDescriptor.readValue(function(error, data) {
                  dataRef.characteristicInfo += ' ++(' + data.toString() + ')';
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


  var makeOnReadSpecificCharacteristics = function(callback, dataRef) {
    return function(error, data) {
      if (data) {
        var string = data.toString('ascii');

        dataRef.characteristicInfo += '\n    value       ' + data.toString('hex') + ' | \'' + string + '\'';
      }
      callback();
    }
  }


  var makeOnDiscoverCharacteristicsFn = function(callback) {
      var characteristicIndex = 0;

      var getDescriptorsInfo = function(callback, characteristic, characteristicInfo) {
        var data = {
          characteristicInfo: characteristicInfo,
          characteristic: characteristic
        }

        var series = {
          // step-1
          step1: function(callback) {
            var onDiscoverDescriptors = makeOnDiscoverDescriptorsFn(callback, data);
            characteristic.discoverDescriptors(onDiscoverDescriptors);
          },
          // step-2
          step2: function(callback) {
            data.characteristicInfo += '\n    properties  ' + characteristic.properties.join(', ');

            var onReadSpecificCharacteristics = makeOnReadSpecificCharacteristics(callback, data);
            console.log(characteristicInfo);

            if (characteristic.properties.indexOf('read') !== -1) {
              characteristic.read(onReadSpecificCharacteristics);
            } else {
              callback();
            }
          }
        }
          
          var seriesAllDone = function() {
              if (DEBUG) {
                  console.log(data.characteristicInfo);
              }
              characteristicIndex++;
              callback();
          }

          async.series( series, seriesAllDone);
      }

      var onDiscoverCharacteristics =  function(error, characteristics) {
          var finalCallback = function(error) {
              serviceIndex++;
              callback();
          }

          var testCondition = function () {
              if (DEBUG) {
                  console.log("onDiscoverCharacteristics", characteristicIndex, characteristics.length);
              }
              return (characteristicIndex < characteristics.length);
          }

          var workerFn = function(callback) {

              var idx = characteristicIndex;
              var characteristic = characteristics[characteristicIndex];

              if (DEBUG) {
                var characteristicInfo = '  -->' + characteristic.uuid;
                if (characteristic.name) {
                  characteristicInfo += ' --(' + characteristic.name + ')';
                }
              }


              var onFfe1Notify = function() { }

              if (characteristic.uuid == "ffe1") {
                characteristic.on('read', function(data, isNotification) {
                  if (DEBUG) {
                    console.log('on -> characteristic read ' , data.toString().trim() ,    isNotification);
                  }
                  onGotOurData(peripheral, data.toString().trim());
                });

                characteristic.notify(true, onFfe1Notify);


              } // matched

              getDescriptorsInfo(callback, characteristic, characteristicInfo);
          }

          async.whilst( testCondition, workerFn, finalCallback );
      } 
      return onDiscoverCharacteristics;
  }


  var onDiscoverServices = function(error, services) {
      var finalCallback = function (err) {
          // peripheral.disconnect();
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

          if (DEBUG) {
              console.log("->", serviceInfo);
          }
        
          var onDiscoverCharacteristics = makeOnDiscoverCharacteristicsFn(callback);

          // service.discoverCharacteristics(['ffe1'], onDiscoverCharacteristics);
          service.discoverCharacteristics([], onDiscoverCharacteristics);
      }

      async.whilst( testCondition , workerFn , finalCallback );
  }

  var onConnect = function(error) {
    peripheral.discoverServices([], onDiscoverServices);
  }

  peripheral.connect(onConnect);

}