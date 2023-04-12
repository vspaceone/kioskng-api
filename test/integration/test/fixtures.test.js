const { startLambda, stopLambda } = require("../helper");

before(function() {
    this.timeout(50000);
    //startLambda();
})

after(async function() {
    this.timeout(10000);
    //await stopLambda();
})