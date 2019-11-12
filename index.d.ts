declare module '@navico-mobile/base32';

declare namespace base32 {
  function encode(input: string): string;
  function decode(input: string): string;
}

export default base32