const HeadLength = 8;

export class Client {
    socket;
    handlers;
    dataWrapper;
    messages;

    constructor(host, port) {
        this.dataWrapper = new JsonDataWrapper();
        this.handlers = new Map();
        this.messages = [];
        this.socket = new WebSocket(`ws://${host}:${port}/`);

        this.socket.onmessage = event => {
            new Response(event.data).arrayBuffer()
            .then(arrayBuffer => {
                let head = new Int32Array(arrayBuffer, 0, 2);
                let scId = head[0];
                let handler = this.handlers.get(scId);
                let data = new Uint8Array(arrayBuffer, HeadLength, arrayBuffer.byteLength - HeadLength);
                handler(this.dataWrapper.formatRaw(data));
            });
        }
        this.socket.onopen = event => {
            while (this.messages.length != 0) {
                const message = this.messages.shift();
                this.socket.send(message.head);
                this.socket.send(message.body);
            }
            console.log('connected');
        }
        this.socket.onclose = event => {
            console.log('disconnected');
        }
        this.socket.onerror = event => {
            console.error(event);
        }
    }

    addMessage(head, body) {
        this.messages.push({head, body});
    }

    bind(scId, callback) {
        this.handlers.set(scId, callback);
    }

    send(csId, value) {
        const data = this.dataWrapper.formatObject(value);
        const result = new Int32Array(2);
        result[0] = Number(csId);
        result[1] = data.length;
        if (this.socket.readyState == this.socket.OPEN) {
            this.socket.send(result);
            this.socket.send(data);
            return;
        }
        this.addMessage(result, data);
    }
}

export class JsonDataWrapper {
    decoder;
    encoder;

    constructor() {
        this.decoder = new TextDecoder("utf-8");
        this.encoder = new TextEncoder();
    }

    formatRaw(data) {
        return JSON.parse(this.decoder.decode(data));
    }

    formatObject(value) {
        return JSON.stringify(this.encoder.encode(value));
    }
}
