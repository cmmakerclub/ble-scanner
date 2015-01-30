var Cylon = require('cylon');

Cylon.robot({
  connections: {
    bluetooth: { adaptor: 'ble', uuid: 'da9ee4f0576f4d989a5ca0d07b666027' }
  },

  devices: {
    deviceInfo: { driver: 'ble-device-information' }
  },

  display: function(err, data) {
    if (!!err) {
      console.log("Error: ", err);
      return;
    }

    console.log("Data: ", data);
  },

  work: function(my) {
    my.deviceInfo.getManufacturerName(my.display);
  }
}).start();