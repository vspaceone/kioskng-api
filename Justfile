module := ""
cmd := ""

# Performs "sam build" for template
build:
    sam build

# Performs "sam build" for template and starts local lambda containers
start-local-lambda: build
    sam local start-lambda

# Execute npm within module folders; Use parameters "module=" (for the module) and "cmd=" (for the npm arguments/commands to run)
npm:
    cd src/{{module}} && npm {{cmd}}    

# Runs all tests within test folder recursively with mocha
test:
    mocha --recursive test/integration/test/*

# Runs all tests within test folder recursively with mocha; Also instructs the test fixture to handle a local lambda server which will be built up before and destroyed after tests were run
test-handle-local-lambda:
    HANDLE_LOCAL_LAMBDA_RUN=true mocha --recursive test/integration/test/*

deploy-test:
    sam deploy --stack-name kioskng-api-test