const base32 = require('../src');

describe('base32 converter', () => {
  it('can encode an array buffer into base32', () => {
    const yOffset = 2017;
    const z = 11;
    const x = 2;
    const y = 2019;

    const a = (y - yOffset) << 9;
    const b = z << 5;
    const c = x;

    const buffer = new ArrayBuffer(5);
    const dataView = new DataView(buffer);

    dataView.setInt16(0, a + b + c, true);
    dataView.setInt16(2, 0, true);

    const checkSum = (dataView.getInt8(0, true) + dataView.getInt8(1, true)) % 0xff;
    dataView.setInt8(4, checkSum, true);

    const input = String.fromCharCode.apply(null, new Uint8Array(buffer));
    const res = base32.encode(input);

    expect(res.length).toEqual(8);
    expect(res).toEqual('KHBGGG92');
  });

  it('can decode a base32 string into an array buffer', () => {
    const input = 'KHBZDG92';
    const res = base32.decode(input);
    const isArrayBuffer = Object.prototype.toString.call(res) === '[object ArrayBuffer]';

    const dataView = new DataView(res);
    const checkSum = (dataView.getInt8(0, true) + dataView.getInt8(1, true)) % 0xff;

    expect(isArrayBuffer).toEqual(true);
    expect(checkSum).toEqual(-25);
  });
});
