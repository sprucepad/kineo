/**
 * Types of errors related to Kineo.
 */
export const enum KineoErrorKind {}

/**
 * A Kineo error.
 */
export class KineoError extends Error {
  /**
   * The type of error.
   */
  kind: KineoErrorKind;

  /**
   * Creates a new Kineo error.
   * @param kind The type of error.
   * @param message The message.
   */
  constructor(kind: KineoErrorKind, message?: string) {
    super(message ?? KineoError.getMessageFromKind(kind));
    this.kind = kind;
  }

  /**
   * Gets a message for a type of error.
   * @param kind The type.
   * @returns A message.
   */
  static getMessageFromKind(kind: KineoErrorKind) {
    switch (kind) {
      default:
        return "no message";
    }
  }
}
