var events = require('events');
var util = require('util');
var Q = require('q');
var _ = require("underscore");
var noble = require('noble');

var GENERIC_ACCESS_SERVICE_UUID = '1800';
var DEVICE_NAME_CHARACTERISTIC_UUID = '2a00';

function MyBle(peripheral) {
  console.log("Executing MyBle Constructor");
  this._peripheral = peripheral;
  this._services = {};
  this._characteristics = {};

  this._targetCharacteristics = null;

  this.uuid = peripheral.uuid;
  this.deferred = Q.defer();


  var disconnect = this.onDisconnect.bind(this)
  this._peripheral.on('disconnect', disconnect);  
  this._peripheral.removeListener('disconnect', disconnect);


  this._onDiscoverServices = function(deferred) {
    deferred.resolve();
  }

  this._onReadFn =  function(data) {
    console.log(data.toString().trim())
  }

  this._onRead = function(deferred, args) {
    if (args[0].length > 1) {
      this.disconnect();
      deferred.resolve(args);
    }
  }
}


util.inherits(MyBle, events.EventEmitter);



MyBle.prototype.discoverServicesAndCharacteristics = function(callback) {
  var deferred = Q.defer();
  this._peripheral.discoverAllServicesAndCharacteristics(function(error, services, characteristics) {
    if (error === null) {
      for (var i in services) {
        var service = services[i];
        var serviceUuid = service.uuid;

        this._services[serviceUuid] = service;

        this._characteristics[serviceUuid] = {};

        for(var j in services[i].characteristics) {
          var characteristic = services[i].characteristics[j];

          this._characteristics[serviceUuid][characteristic.uuid] = characteristic;
        }
      }
      this._onDiscoverServices(deferred);
    }

  }.bind(this));

   return deferred.promise;
};

MyBle.prototype.method_name = function(first_argument) {
  console.log("HI");
};

MyBle.prototype.connect = function(callback) {
  var that = this;

  this._peripheral.connect(function() {
    console.log("EMIT CONNECTED");
    that.emit("peripheral connected", arguments);
    that.deferred.resolve(arguments);
  });

  return this.deferred.promise;
};

MyBle.prototype.disconnect = function() {
  this._peripheral.disconnect(function() { console.log("DONE-DISCONNECTED") });
};

MyBle.prototype.onDisconnect = function() {
  console.log("peripheral call disconnect")
  this.deferred.resolve("OK");
  this.emit('disconnect');
};


MyBle.prototype.onDataOkay = function() { };


// MyBle.prototype.writeCharacteristic = function(serviceUuid, characteristicUuid, data, callback) {
//   this._characteristics[serviceUuid][characteristicUuid].write(data, false, callback);
// };

MyBle.prototype.readCharacteristic = function(serviceUuid, characteristicUuid) {
  this._targetCharacteristics = this._characteristics[serviceUuid][characteristicUuid];
  var that = this;

  var deferred = Q.defer();


  that._targetCharacteristics.notify(true);
  that._targetCharacteristics.on("read", function() {
      that._onRead(deferred, arguments);
  });

  return deferred.promise;
};


var l = { };

MyBle.discover = function(uuid, callback) {
  var deferred = Q.defer();
  // noble.on('stateChange', function() {
  //   console.log("stateChange", arguments)
    var onDiscover = function(peripheral) {
      console.log("ON DISCOVER", peripheral.advertisement.localName);
        if (peripheral.uuid == uuid) {
          noble.removeListener('discover', onDiscover);
          noble.stopScanning();
          var bb = new MyBle(peripheral);
          l[peripheral.uuid] = bb;
          callback(bb, deferred);
        }

    }

    noble.on('discover', onDiscover);
    // noble.startScanning([]);
    noble.startScanning([], false); // any service UUID, allow duplicates

  // });
  return deferred.promise;
};


//#MyBle.discover("dda21ca37141486cb45efe0494ed328e", function(ble) { // dht11
// MyBle.discover("431f28bb9a6f48d598a7e0d1f3f40e38", function(ble) {

var genFn = function() {
  var pack = function(ble, deferred) {

    var onData = function() {
        console.log("data", arguments);
        ble.disconnect();
        deferred.resolve();
    }

    var onDiscoverServicesAndCharacteristics = function() {
        var onRead = function(data) {
            console.log(data.toString().trim());
        }
        ble.readCharacteristic('ffe0', 'ffe1', onRead);
    }

    var onPeripheralConnected = function() {
        ble.discoverServicesAndCharacteristics(onDiscoverServicesAndCharacteristics)
    }

    ble.connect()
      .then(function() {
        return ble.discoverServicesAndCharacteristics()
      })
      .then(function() {
        return ble.readCharacteristic('ffe0', 'ffe1')
      })
      .then(function() {
				var args = arguments;
        console.log("LAST ONE", ble.uuid, args[0][0].toString());
        return ble.disconnect()
      })
      .then(function() {
        deferred.resolve();
      })
      .done();

      return deferred.promise;
  }
  return pack;
}

function promiseSeries(series) {
    var ready = Q(null);
    var result = {};
    Object.keys(series)
        .forEach(function (key) {
            ready = ready.then(function () {
                return series[key]();
            }).then(function (res) {
                result[key] = res;
            });
        });
    return ready.then(function () {
        return result;
    });
}

var wrap = function(uuid) {
    return function() {
      return Q.fapply(MyBle.discover, [uuid, genFn()])
    }
}



// var all = { 
//   'dda21ca37141486cb45efe0494ed328e' : function() { return )},
//   '431f28bb9a6f48d598a7e0d1f3f40e38': function() { return MyBle.discover("431f28bb9a6f48d598a7e0d1f3f40e38", genFn())}
// }
// promiseSeries(all).then(function() {
//   console.log("GOT you")
// });

// })

  // Q.fcall(wrap, "431f28bb9a6f48d598a7e0d1f3f40e38")
    MyBle.discover("431f28bb9a6f48d598a7e0d1f3f40e38", genFn())
    .then(wrap("431f28bb9a6f48d598a7e0d1f3f40e38"))
    .then(wrap("431f28bb9a6f48d598a7e0d1f3f40e38"))
    .then(wrap("431f28bb9a6f48d598a7e0d1f3f40e38"))
    .then(wrap("431f28bb9a6f48d598a7e0d1f3f40e38"))
    .then(wrap("431f28bb9a6f48d598a7e0d1f3f40e38"))
    .then(wrap("431f28bb9a6f48d598a7e0d1f3f40e38"))
    .then(wrap("431f28bb9a6f48d598a7e0d1f3f40e38"))
    .then(wrap("431f28bb9a6f48d598a7e0d1f3f40e38"))
    .then(wrap("431f28bb9a6f48d598a7e0d1f3f40e38"))
    .then(wrap("431f28bb9a6f48d598a7e0d1f3f40e38"))
    .then(wrap("431f28bb9a6f48d598a7e0d1f3f40e38"))
    .then(wrap("431f28bb9a6f48d598a7e0d1f3f40e38"))
    .then(wrap("431f28bb9a6f48d598a7e0d1f3f40e38"))
    .then(wrap("431f28bb9a6f48d598a7e0d1f3f40e38"))
    .then(wrap("431f28bb9a6f48d598a7e0d1f3f40e38"))
    .then(wrap("431f28bb9a6f48d598a7e0d1f3f40e38"))
    .then(function() { console.log("HELLO") })
//     function() {
//       return Q.fapply(MyBle.discover, ["431f28bb9a6f48d598a7e0d1f3f40e38", genFn()])
//       // return MyBle.discover("dda21ca37141486cb45efe0494ed328e", genFn())
//     }
//   )


// var chain = itemsToProcess.reduce(function (previous, item) {
//     return previous.then(function (previousValue) {
//         // do what you want with previous value
//         // return your async operation
//         return Q.delay(100);
//     })
// }, Q.resolve(/* set the first "previousValue" here */));

// chain.then(function (lastResult) {
//     // ...
// });


// MyBle.discover("dda21ca37141486cb45efe0494ed328e", genFn())
//   .then(function() {
//     return MyBle.discover("dda21ca37141486cb45efe0494ed328e", genFn())
//   })
//   .then(function() {
//     console.log("FINAL");
//   })

module.exports = MyBle;
