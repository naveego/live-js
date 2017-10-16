
import * as ioclient from "socket.io-client";

/**
 * This event indicates a JSON-RPC request which expects a response.
 */
export const RPCEvent = "rpc";

/**
 * RPCRequest represents an RPC request which should be sent to the socket
 * identified by the segment of the method before the ".".
 *
 * @export
 * @interface RPCRequest
 */
export interface RPCRequest {
    /**
     * A unique ID used to correlate the response message.
     *
     * @type {string}
     * @memberof RPCRequest
     */
    id: string;
    /**
     * A sender should set the method using the format `{socketID}.{handlerName}.{methodName}`.
     * The Live service will propegate the request to `{socketID}` with the method changed to `{handlerName}.{methodName}`.
     *
     * @type {string}
     * @memberof RPCRequest
     */
    method: string;
    params: any[];
}

/**
 * Events emitted by socket.io.
 */
export type SocketIOEvent = "connect"|"connect_error"|"connect_timeout"|"error"|"disconnect"|"reconnect"|"reconnect_attempt"|"reconnecting"|"reconnect_error"|"reconnect_failed"

/**
 * RPCResponse contains the response to an RPC request.
 *
 * @export
 * @interface RPCResponse
 */
export interface RPCResponse {
    id: any;
    /**
     * The result of the RPC request. Must be null if there is an error.
     *
     * @type {*}
     * @memberof RPCResponse
     */
    result?: any;
    error?: any;
}

export interface RPCError {
    code: number;
    message: string;
    data?: any;
}

export class LiveClient {
    private id = 0;
    constructor(private socket: SocketIOClient.Socket) {

    }
    
    /**
     * The ID of the socket.io socket this client is using.
     * 
     * @readonly
     * @type {string}
     * @memberof LiveClient
     */
    get socketID(): string {
        return this.socket.id;
    }

    /**
     * Authenticate authenticates this client with the Live service. Nothing else will work until you call this.
     * The returned promise will resolve with `true` if you are authenticated.
     * 
     * @param {string} token 
     * @returns {Promise<boolean>} 
     * @memberof LiveClient
     */
    authenticate(token: string): Promise<boolean>{
        return this.request<boolean>("", "Live.Authenticate", token);
    }

    /**
     * Disconnects from Live service.
     * 
     * @memberof LiveClient
     */
    disconnect() {
        this.socket.disconnect();
    }

    /**
     * Sends a notification, which expects no reply.
     *
     * @template TRequest
     * @param {string} method
     * @param {TRequest} param
     * @param {(error: shared.RPCError, result: TResponse) => void} callback
     * @memberof LiveClient
     */
    notify<TRequest>(method: string, param: TRequest): void {
        this.socket.emit(method, param);
    }

    /**
     * Calls a method over RPC. Returns a promise which will be resolved with the result of the call, or rejected if there is an error.
     *
     * @template TResponse
     * @param {string} address - The address to send the request to. This will be the ID of the socket of the component you want to send the request to.
     * @param {string} method - The method to invoke.
     * @param {TRequest} param - The parameter object of the method.
     * @returns {Promise<TResponse>} 
     * @memberof LiveClient
     */
    request<TResponse>(address: string, method: string, param: any): Promise<TResponse> {
        this.id++;
        return new Promise((resolve, reject) => {
            this.socket.emit(RPCEvent, <RPCRequest>{ id: this.id.toString(), method: address + "." + method, params: [param] },
                function (response: RPCResponse) {
                    if(response.error){
                        return reject(response.error);
                    }
                    resolve(response.result);
                });            
        })
    }

    /**
     * Wires up a handler for the socket.io events. The primary use of this is for `client.on('connect', () => { /* you're connected!*\/  })`
     * 
     * @param {SocketIOEvent} event 
     * @param {Function} callback 
     * @memberof LiveClient
     */
    on(event: SocketIOEvent, callback: Function){
        this.socket.on(event, callback);
    }

    /**
     * Wires up a handler for a normal socket.io notification with no response/ack.
     * 
     * @template TNotification 
     * @param {string} method 
     * @param {(notification: TNotification) => void} callback 
     * @memberof LiveClient
     */
    onNotification<TNotification>(method: string, callback: (notification: TNotification) => void): void {
        this.socket.on(method, callback);
    }

    /**
     * Wires up a handler for an RPC-style request.
     * 
     * @template TRequest 
     * @template TResponse 
     * @param {string} method - The method this handler will listen for.
     * @param {(request: TRequest) => Promise<TResponse>} handler - The handler for the request. It must return a promise containing the response.
     * @memberof LiveClient
     */
    onRequest<TRequest, TResponse>(
        method: string,
        handler: (request: TRequest) => Promise<TResponse>): void {
        this.socket.on(RPCEvent, function (request: RPCRequest, callback: (response: RPCResponse) => void) {
            if (request.method === method) {
                handler(request.params[0]).catch((err) => callback({ id: request.id, error: { code: 500, message: err } }))
                    .then((result) => callback({ id: request.id, result: result }));
            }
        });
    }
}

/**
 * Client for the Pipeline namespace.
 * 
 * @export
 * @class PipelineLiveClient
 * @extends {LiveClient}
 */
export class PipelineLiveClient extends LiveClient{
    
        constructor(socket: SocketIOClient.Socket) {
            super(socket);
        }
        
        /**
         * Gets the registered agents, as a hash of agentID:socketID.
         * 
         * @returns {Promise<{[agentID:string]:string}>} 
         * @memberof PipelineLiveClient
         */
        public getRegisteredAgents(): Promise<{[agentID:string]:string}>{
            return this.request("Pipeline", "GetRegisteredAgents", {})
        }
    
    
    }