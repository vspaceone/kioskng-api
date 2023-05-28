# kioskng-api

This is the AWS Serverless Application Model based project implementing the kioskng projects REST API.

Documentation can be found in the `docs` folder in this repository.

* [API Documentation](./docs/api.md)
* [Contributing/AWS SAM Help](./docs/aws-sam.md)

## Dependencies

Following technologies are used, which also are the dependencies for a development environment:

* [AWS CLI](https://github.com/aws/aws-cli)
* [Docker (for SAM local)](https://www.docker.com/)
* [Just](https://github.com/casey/just)
* [NodeJS](https://nodejs.org/en)
* [NPM](https://www.npmjs.com/)
* [SAM CLI](https://github.com/aws/aws-sam-cli)

## Just (easy contributing)

As this project has multiple technologies on which it builds on, vastly different commands need to be run for different steps throughout the development lifecycle.
For that reason a [Justfile](./Justfile) has been added, that defined all recurring commands and enables them to be easily called from project root.
Just make sure to have [Just](https://github.com/casey/just) apart from the other Dependencies (see above) installed on your machine!

### Environment

To be able to deploy with the Justfile you need a .env file in the repository root looking like this with proper values:

```
RUNTIME_REGION=aws-region-0

USER_POOL_ID=aws-region-0_ABCDE1234
CLIENT_ID=clientidforyourclient
```

## Testing

Integration testing of the Lambdas can be done locally with code within the test/integration folder. For that firstly you need to start the lambda APIs locally and can afterwards run the tests (for test development).

You can invoke tests also through the Justfile
