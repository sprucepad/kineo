/**
 * Types of KineoKit errors.
 */
export const enum KineoKitErrorKind {
  MissingSchema = "MissingSchema",
  MissingClient = "MissingClient",
  NoSupport = "NoSupport",
  BreakingSchemaChange = "BreakingSchemaChange",
  FilePathNecessary = "FilePathNecessary",
}

/**
 * A KineoKit error.
 */
export class KineoKitError<T> extends Error {
  /**
   * Creates a new KineoKit error.
   * @param kind The type of error.
   * @param data Optional data.
   * @param message The error message.
   */
  constructor(
    public kind: KineoKitErrorKind,
    public data?: T,
    message?: string,
  ) {
    super(message ?? KineoKitError.getMessageFromKind(kind));
  }

  /**
   * Gets a default message for an error type.
   * @param kind The type of error.
   * @returns The error message.
   */
  static getMessageFromKind(kind: KineoKitErrorKind) {
    switch (kind) {
      case KineoKitErrorKind.NoSupport:
        return "the adapter you're using doesn't support this function";
      case KineoKitErrorKind.MissingClient:
      case KineoKitErrorKind.MissingSchema:
        return `${kind === KineoKitErrorKind.MissingClient ? "client" : "schema"} is undefined. check if the file exists or if imports are resolving correctly`;
      case KineoKitErrorKind.BreakingSchemaChange:
        return "a breaking change was detected in the schema";
      case KineoKitErrorKind.FilePathNecessary:
        return "file path style imports are necessary for this action";
      default:
        return "no message";
    }
  }
}
