/**
 * Remove $typeName from protobuf oriented types.
 */
export type DeepOmit<T, K extends PropertyKey> = T extends object
  ? T extends Array<infer U>
    ? Array<DeepOmit<U, K>>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : T extends Map<any, any>
    ? T
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : T extends Set<any>
    ? T
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    : T extends Function
    ? T
    : {
        [P in keyof T as P extends K ? never : P]: DeepOmit<T[P], K>;
      }
  : T;
