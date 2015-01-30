var Q = require('q');
var itemsToProcess = [
	function() { return 1; },
  function() { return 2; }
];

 var chain = itemsToProcess.reduce(function (previous, item) {
     return previous.then(function (previousValue) {
          console.log(previousValue);
         
         // do what you want with previous value
         // return your async operation
         return Q.delay(100);
     })
 }, Q.resolve(9));


chain.then(function() {
	console.log(arguments);
});
