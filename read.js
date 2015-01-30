// #9d7c25067c5b43bca93936d772986635
// #Peripheral discovered!
// #  Name: BLE-SWTH-1
// #  UUID: da9ee4f0576f4d989a5ca0d07b666027
// #  rssi: -89
// #Peripheral discovered!
// #  Name: HMSoft
// #  UUID: 9d7c25067c5b43bca93936d772986635
// #  rssi: -73

// #

var noble = require('noble');


var onDiscover = function(peripheral) {
  console.log("Peripheral discovered!")
  console.log("  Name: " + peripheral.advertisement.localName)
  console.log("  UUID: " + peripheral.uuid);

    var sendData = {
        type: "bleList",
        data: { name: peripheral.advertisement.localName, uuid: peripheral.uuid } 
    };

  if (peripheral_action && peripheral_action.serial_number == peripheral.uuid) {
    console.log("match uuid");
    noble.stopScanning();
    peripheral.connect();
    explore(peripheral);
  } else {
    socket.emit("pi:receive", sendData);  
  }
}


var onScanStop = function() {
  if (reScan) {
        reScan = false;
    console.log('Start rescan');
    noble.startScanning();
    }
}

var onServiceDiscover = function(services) {
    console.log('on -> peripheral services discovered ' + services);


    var serviceIndex = 0;

    services[serviceIndex].on('includedServicesDiscover', function(includedServiceUuids) {
      console.log('on -> service included services discovered ' + includedServiceUuids);
      this.discoverCharacteristics(['ffe1']);
    });

    var createErrorFunction(msg) {
       var fn = function(error) {
          console.error("ERROR: " + msg.reason);
       }
       return fn;
    }

    var onCharacteriseticsDiscover = function(characteristics) {
          console.log('on -> service characteristics discovered ' + characteristics);
          var errFn = createErrorFunction({reason: "write error."}) 

          characteristics[0].write(new Buffer([0x32]), false, errFn);

          var characteristicIndex = 0;

          characteristics[characteristicIndex].on('read', function(data, isNotification) {
            console.log('on -> characteristic read ' + data + ' ' + isNotification);
            console.log(data);

            // peripheral.disconnect();
          });

          characteristics[characteristicIndex].on('write', function() {
            console.log('on -> characteristic write ');

            peripheral.disconnect();
          });

          characteristics[characteristicIndex].on('broadcast', function(state) {
            console.log('on -> characteristic broadcast ' + state);

            // peripheral.disconnect();
          });

          characteristics[characteristicIndex].on('notify', function(state) {
            console.log('on -> characteristic notify ' + state);
            // peripheral.disconnect();
          });

          characteristics[characteristicIndex].on('descriptorsDiscover', function(descriptors) {
            console.log('on -> descriptors discover ' + descriptors);
            var descriptorIndex = 0;
            console.log(descriptors);
          });


          // characteristics[characteristicIndex].read();
          characteristics[characteristicIndex].write(new Buffer(peripheral_action.data));
          //characteristics[characteristicIndex].broadcast(true);
          // characteristics[characteristicIndex].notify(true);
          // characteristics[characteristicIndex].discoverDescriptors();
          //peripheral.disconnect();
        }
        
        services[serviceIndex].on('characteristicsDiscover', );
        services[serviceIndex].discoverIncludedServices();
  };

noble.on('discover', onDiscover);
noble.on('scanStop', onScanStop);
