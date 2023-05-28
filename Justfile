set dotenv-load

module := ""
cmd := ""

# Performs "sam build" for template
build:
    sam build

# Initializes an .env file with variables necessary to deploy with this Justfile
#init-env:
#    @read -p "Please input the Cognito UserPoolId you want to use when deploying: " USER_POOL_ID
#    @read -p "Please input the Cognito ClientId you want to use when deploying: " CLIENT_ID
#    printenv
#    printf "USER_POOL_ID=$USER_POOL_ID\nCLIENT_ID=$CLIENT_ID" > .env

# Performs "sam build" for template and starts local lambda containers
start-local-lambda: build
    RUNTIME_REGION=$RUNTIME_REGION sam local start-lambda

# Execute npm within module folders; Use parameters "module=" (for the module) and "cmd=" (for the npm arguments/commands to run)
npm:
    cd src/{{module}} && npm {{cmd}}    

# Runs all tests within test folder recursively with mocha
test:
    mocha --recursive test/integration/test/*

local-test:
    LOCAL_LAMBDA_RUN=true mocha --recursive test/integration/test/*

# Runs all tests within test folder recursively with mocha; Also instructs the test fixture to handle a local lambda server which will be built up before and destroyed after tests were run
test-handle-local-lambda:
    RUNTIME_REGION=$RUNTIME_REGION HANDLE_LOCAL_LAMBDA_RUN=true mocha --recursive test/integration/test/*

deploy-test:
    sam deploy --stack-name kioskng-api-test --parameter-overrides "Stage=test UserPoolId=$USER_POOL_ID ClientId=$CLIENT_ID" --no-confirm-changeset

deploy-prod:
    sam deploy --stack-name kioskng-api-prod --parameter-overrides "Stage=prod UserPoolId=$USER_POOL_ID ClientId=$CLIENT_ID" --no-confirm-changeset

