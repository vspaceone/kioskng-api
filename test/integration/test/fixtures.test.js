const { startLambda, stopLambda } = require("../helper");

before(function() {
    this.timeout(50000);
    if (process.env.HANDLE_LOCAL_LAMBDA_RUN){
        startLambda();
    }
})

after(async function() {
    this.timeout(10000);
    if (process.env.HANDLE_LOCAL_LAMBDA_RUN){
        await stopLambda();
    }
})