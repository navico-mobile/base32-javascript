(function base32Function() {
  const alphabet = 'GBK41YSZQTFH2VWX3UR56J7LMNCP9ADE';
  const alias = {
    o: 0, i: 1, l: 1, s: 5,
  };

  let lookup = () => {
    const table = {};
    for (let i = 0; i < alphabet.length; i++) {
      table[alphabet[i]] = i;
    }
    Object.keys(alias).forEach((key) => {
      table[key] = table[`${alias[key]}`];
    });
    lookup = function lookupTable() { return table; };
    return table;
  };

  function Encoder() {
    this.output = '';
    let bitCount = 0;
    let value = 0;

    // Read one byte of input
    // Should not really be used except by "update"
    this.readByte = function readByte(byte) {
      let parsedByte = byte;

      // coerce the byte to an int
      if (typeof parsedByte === 'string') parsedByte = parsedByte.charCodeAt(0);

      value |= parsedByte << bitCount;
      bitCount += 8;

      while (bitCount >= 5) {
        this.output += alphabet[value & 0x1F];
        value >>= 5;
        bitCount -= 5;
      }

      return 1;
    };

    // Flush any remaining bits left in the stream
    this.finish = function finish() {
      if (bitCount > 0) {
        const output = this.output + alphabet[value & 0x1F];
        this.output = '';
        return output;
      }

      return '';
    };
  }

  Encoder.prototype.update = function update(input, flush) {
    for (let i = 0; i < input.length;) {
      i += this.readByte(input[i]);
    }
    // consume all output
    let { output } = this;
    this.output = '';
    if (flush) {
      output += this.finish();
    }
    return output;
  };


  // Functions analogously to Encoder

  function Decoder() {
    let skip = 0; // how many bits we have from the previous character
    let byte = 0; // current byte we're producing
    let writeIndex = 0;

    this.output = new ArrayBuffer(8);
    const uint8View = new Uint8Array(this.output);

    // Consume a character from the stream, store
    // the output in this.output. As before, better
    // to use update().
    this.readChar = function readChar(char) {
      let charString = char;

      if (typeof char !== 'string' && typeof char === 'number') {
        charString = String.fromCharCode(char);
      }

      const upperCaseChar = charString.toUpperCase();
      const val = lookup()[upperCaseChar];

      if (typeof val === 'undefined') {
        // character does not exist in our lookup table
        return; // skip silently. An alternative would be:
        // throw Error('Could not find character "' + char + '" in lookup table.')
      }


      byte |= (val & 0x1F) << skip;
      skip += 5;


      if (skip >= 8) {
        // we have enough to preduce output
        // console.log(byte & 0xFF)
        uint8View[writeIndex] = (byte & 0xFF);
        writeIndex += 1;
        byte >>>= 8;
        skip -= 8;
      }
    };
  }


  Decoder.prototype.update = function update(input) {
    for (let i = 0; i < input.length; i++) {
      this.readChar(input[i]);
    }


    return this.output;
  };

  function encode(input) {
    const encoder = new Encoder();
    const output = encoder.update(input, true);
    return output;
  }

  function decode(input) {
    const decoder = new Decoder();
    const output = decoder.update(input, true);
    return output;
  }

  let crypto;
  let fs;

  function sha1(input, cb) {
    if (typeof crypto === 'undefined') crypto = require('crypto');
    const hash = crypto.createHash('sha1');
    hash.digest = (function digestHash(digest) {
      return function encodeHash() {
        return encode(digest.call(this, 'binary'));
      };
    }(hash.digest));
    if (cb) { // streaming
      if (typeof input === 'string' || Buffer.isBuffer(input)) {
        try {
          return cb(null, sha1(input));
        } catch (err) {
          return cb(err, null);
        }
      }
      if (typeof input.on !== 'function') return cb({ message: 'Not a stream!' });
      input.on('data', (chunk) => { hash.update(chunk); });
      input.on('end', () => { cb(null, hash.digest()); });
      return undefined;
    }

    // non-streaming
    if (input) {
      return hash.update(input).digest();
    }
    return hash;
  }
  sha1.file = function file(filename, cb) {
    if (filename === '-') {
      process.stdin.resume();
      return sha1(process.stdin, cb);
    }
    if (typeof fs === 'undefined') fs = require('fs');
    return fs.stat(filename, (err, stats) => {
      if (err) return cb(err, null);
      if (stats.isDirectory()) return cb({ dir: true, message: 'Is a directory' });
      return sha1(require('fs').createReadStream(filename), cb);
    });
  };

  const base32 = {
    Decoder,
    Encoder,
    encode,
    decode,
    sha1,
  };

  if (typeof window !== 'undefined') {
    window.base32 = base32;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = base32;
  }
}());
