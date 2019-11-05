;(function(){

var alphabet = 'GBK41YSZQTFH2VWX3UR56J7LMNCP9ADE'
var alias = { o:0, i:1, l:1, s:5 }

 

/**
 * Build a lookup table and memoize it
 *
 * Return an object that maps a character to its
 * byte value.
 */

 

var lookup = function() {
    var table = {}
    // Invert 'alphabet'
    for (var i = 0; i < alphabet.length; i++) {
        table[alphabet[i]] = i
    }
    // Splice in 'alias'
    for (var key in alias) {
        if (!alias.hasOwnProperty(key)) continue
        table[key] = table['' + alias[key]]
    }
    lookup = function() { return table }
    return table
}

 

/**
 * A streaming encoder
 *
 *     var encoder = new base32.Encoder()
 *     var output1 = encoder.update(input1)
 *     var output2 = encoder.update(input2)
 *     var lastoutput = encode.update(lastinput, true)
 */

 

function Encoder() {
    var skip = 0 // how many bits we will skip from the first byte
    var bits = 0 // 5 high bits, carry from one byte to the next

 

    this.output = ''
    var bitCount = 0
    var value = 0
    
    // Read one byte of input
    // Should not really be used except by "update"
    this.readByte = function(byte) {
        // coerce the byte to an int
        if (typeof byte == 'string') byte = byte.charCodeAt(0)
        
        value |= byte << bitCount
        bitCount += 8
        
        while (bitCount >= 5)
        {
            this.output += alphabet[value & 0x1F]
            value >>= 5
            bitCount -= 5
        }

 

        return 1
    }

 

    // Flush any remaining bits left in the stream
    this.finish = function() {
        if (bitCount > 0)
        {
            var output = this.output + alphabet[value & 0x1F]
            this.output = ''
            return output
        }
        else
        {
            return ''
        }
    }
}

 

/**
 * Process additional input
 *
 * input: string of bytes to convert
 * flush: boolean, should we flush any trailing bits left
 *        in the stream
 * returns: a string of characters representing 'input' in base32
 */

 

Encoder.prototype.update = function(input, flush) {
    for (var i = 0; i < input.length; ) {
        i += this.readByte(input[i])
    }
    // consume all output
    var output = this.output
    this.output = ''
    if (flush) {
      output += this.finish()
    }
    return output
}

 

// Functions analogously to Encoder

 

function Decoder() {
    var skip = 0 // how many bits we have from the previous character
    var byte = 0 // current byte we're producing
    var writeIndex = 0

 

    this.output = new ArrayBuffer(8)
    var uint8View = new Uint8Array(this.output);

 

    // Consume a character from the stream, store
    // the output in this.output. As before, better
    // to use update().
    this.readChar = function(char) {
        if (typeof char != 'string'){
            if (typeof char == 'number') {
                char = String.fromCharCode(char)
            }
        }
        char = char.toUpperCase()
        var val = lookup()[char]
        if (typeof val == 'undefined') {
            // character does not exist in our lookup table
            return // skip silently. An alternative would be:
            // throw Error('Could not find character "' + char + '" in lookup table.')
        }

 


        byte |= (val & 0x1F) << skip
        skip += 5

 

        if (skip >= 8) {
            // we have enough to preduce output
            // console.log(byte & 0xFF)
            uint8View[writeIndex] = (byte & 0xFF)
            writeIndex += 1
            byte >>>= 8
            skip -= 8
        }
    }
}

 

Decoder.prototype.update = function(input, flush) {
    for (var i = 0; i < input.length; i++) {
        this.readChar(input[i])
    }

 

    return this.output
}

 

/** Convenience functions
 *
 * These are the ones to use if you just have a string and
 * want to convert it without dealing with streams and whatnot.
 */

 

// String of data goes in, Base32-encoded string comes out.
function encode(input) {
    var encoder = new Encoder()
    var output = encoder.update(input, true)
    return output
}

 

// Base32-encoded string goes in, decoded data comes out.
function decode(input) {
    var decoder = new Decoder()
    var output = decoder.update(input, true)
    return output
}

 

/**
 * sha1 functions wrap the hash function from Node.js
 *
 * Several ways to use this:
 *
 *     var hash = base32.sha1('Hello World')
 *     base32.sha1(process.stdin, function (err, data) {
 *       if (err) return console.log("Something went wrong: " + err.message)
 *       console.log("Your SHA1: " + data)
 *     }
 *     base32.sha1.file('/my/file/path', console.log)
 */

 

var crypto, fs
function sha1(input, cb) {
    if (typeof crypto == 'undefined') crypto = require('crypto')
    var hash = crypto.createHash('sha1')
    hash.digest = (function(digest) {
        return function() {
            return encode(digest.call(this, 'binary'))
        }
    })(hash.digest)
    if (cb) { // streaming
        if (typeof input == 'string' || Buffer.isBuffer(input)) {
            try {
                return cb(null, sha1(input))
            } catch (err) {
                return cb(err, null)
            }
        }
        if (!typeof input.on == 'function') return cb({ message: "Not a stream!" })
        input.on('data', function(chunk) { hash.update(chunk) })
        input.on('end', function() { cb(null, hash.digest()) })
        return
    }

 

    // non-streaming
    if (input) {
        return hash.update(input).digest()
    }
    return hash
}
sha1.file = function(filename, cb) {
    if (filename == '-') {
        process.stdin.resume()
        return sha1(process.stdin, cb)
    }
    if (typeof fs == 'undefined') fs = require('fs')
    return fs.stat(filename, function(err, stats) {
        if (err) return cb(err, null)
        if (stats.isDirectory()) return cb({ dir: true, message: "Is a directory" })
        return sha1(require('fs').createReadStream(filename), cb)
    })
}

 

var base32 = {
    Decoder: Decoder,
    Encoder: Encoder,
    encode: encode,
    decode: decode,
    sha1: sha1
}

 

if (typeof window !== 'undefined') {
  // we're in a browser - OMG!
  window.base32 = base32
}

 

if (typeof module !== 'undefined' && module.exports) {
  // nodejs/browserify
  module.exports = base32
}
})();
