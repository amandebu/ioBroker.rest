/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
'use strict';

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const { testAdapter } = require('@iobroker/testing/build/tests/integration');
const axios = require('axios');
const adapterName = require('./package.json').name.split('.').pop();

// Load your modules here, e.g.:
// const fs = require("fs");

class RestObjects extends utils.Adapter {

    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'rest'//,
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('objectChange', this.onObjectChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    timeout=null

    processObject(obj,path='',initial=false) {
        if (typeof obj=='object') {
            if (path!='') {path=path+'.'}
            for (const [key, value] of Object.entries(obj)) {
                this.processObject(value,path+key)
    //            this.log.info(`${key}: ${value}`);
            }
        } else {
            const objtype=typeof obj;
            //this.log.info(`${path}: ${obj} (${objtype})`);
            if (!initial) {
                this.setObjectNotExistsAsync(path, {
                    type: 'state',
                    common: {
                        name: path,
    //                    type: 'string',
                        type: typeof ((obj.constructor) (obj)),
                        role: 'value',
                        read: true,
                        write: false,
                    },
                    native: {}
                });
            }
            this.setState(path,{val: obj, ack: true});   
            //this.setStateAsync(path, true); 
        }
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */

    refresh(that,restURL,interval,initial=false) {
        axios({
            method: 'get',
            url: restURL,
            timeout: 10000,
            responseType: 'json'
        }).then(
            async (response) => {
                that.processObject(response.data,'',initial=true);
            }
        ).catch(
            (error) => {
                if (error.response) {
                    // The request was made and the server responded with a status code

                    that.log.warn('received error ' + error.response.status + ' response with content: ' + JSON.stringify(error.response.data));
                } else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js<div></div>
                    that.log.error(error.message);
                } else {
                    // Something happened in setting up the request that triggered an Error
                    that.log.error(error.message);
                }
            }
        );
        that.timeout=that.setTimeout(that.refresh,interval,that,restURL,interval)
    }

    async onReady() {
        // Initialize your adapter here

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        this.log.info('adapter name: '+adapterName);
        const restURL=this.config.restURL;
        const interval=this.config.interval;
        this.log.info('config rest-URL: ' + restURL + ', interval[ms]: '+ interval);

        this.refresh(this,restURL,interval,true);
        //this.tick(this,interval);
        //this.setInterval(function () {this.refresh(restURL);},1000);

        /*
        For every state in the system there has to be also an object of type state
        Here a simple template for a boolean variable named "testVariable"
        Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
        */
        // In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
        this.subscribeStates('*');
        // You can also add a subscription for multiple states. The following line watches all states starting with "lights."
        // this.subscribeStates('lights.*');
        // Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
        // this.subscribeStates('*');

        /*
            setState examples
            you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
        */
        // the variable testVariable is set to true as command (ack=false)
//        await this.setStateAsync('testVariable', true);

        // same thing, but the value is flagged "ack"
        // ack should be always set to true if the value is received from or acknowledged from the target system
//        await this.setStateAsync('testVariable', { val: true, ack: true });

        // same thing, but the state is deleted after 30s (getState will return null afterwards)
//        await this.setStateAsync('testVariable', { val: true, ack: true, expire: 30 });

        // examples for the checkPassword/checkGroup functions
//        let result = await this.checkPasswordAsync('admin', 'iobroker');
//        this.log.info('check user admin pw iobroker: ' + result);

//        result = await this.checkGroupAsync('admin', 'admin');
//        this.log.info('check group user admin group admin: ' + result);
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            // clearTimeout(timeout1);
            // clearTimeout(timeout2);
            // ...
            // clearInterval(interval1);
            this.clearTimeout(this.timeout);    
            callback();
        } catch (e) {
            callback();
        }
    }

    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  * @param {string} id
    //  * @param {ioBroker.Object | null | undefined} obj
    //  */
    // onObjectChange(id, obj) {
    //     if (obj) {
    //         // The object was changed
    //         this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    //     } else {
    //         // The object was deleted
    //         this.log.info(`object ${id} deleted`);
    //     }
    // }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    // onMessage(obj) {
    //     if (typeof obj === 'object' && obj.message) {
    //         if (obj.command === 'send') {
    //             // e.g. send email or pushover or whatever
    //             this.log.info('send command');

    //             // Send response in callback if required
    //             if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
    //         }
    //     }
    // }

}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new RestObjects(options);
} else {
    // otherwise start the instance directly
    new RestObjects();
}