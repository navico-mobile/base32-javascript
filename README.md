# Base 32 encoding/decoding for JavaScript

Base 32 is between hexadecimal notation and Base 64 encoding. It's intended to be a **human-friendly** -- you don't have to worry about punctuation, capitalization, or letters/numbers that are easy to confuse, making it easier to transmit in handwriting or over the phone.

This implementation contains a simplified encoding scheme customized for Navico.

## Getting started

In your shell, install with npm:

```sh
yarn install https://github.com/navico-mobile/base32-javascript.git
```

In your code:

```javascript
const base32 = require('@navico-mobile/base32');

// simple api

const encoded = base32.encode('some data to encode');
const decoded = base32.decode(encoded);

// streaming api
this.encoder = new Base32.encoder();
this.dataCallback = function(chunk) {
    this.emit(this.encoder(chunk));
}
this.closeCallback = function(chunk) {
    this.emit(this.finish()); // flush any remaining bits
}

// easy sha1 hash
const hash = base32.sha1(some_data_to_hash); // DONE.
```


## License

Available under the MIT License.
