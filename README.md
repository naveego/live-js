# live-js
JavaScript client for Naveego Live service.

## Development

* Build: `tsc`
* Publish: Increment the version number in package.json, then `npm publish --access public`

## Usage

Get a socket.io client, then pass it to the constructor of one of the Live clients:

* `LiveClient` 
* `PipelineLiveClient`